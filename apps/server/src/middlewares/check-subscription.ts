import {
	Hospital,
	Patient,
	type PricingTierValue,
	Staff,
	Subscription,
} from "@hms/db";
import type { NextFunction, Request, Response } from "express";
import {
	BillingErrorCodes,
	type FeatureValue,
	GRACE_PERIOD_DAYS,
	getMinimumTierForFeature,
	TIER_LIMITS,
	tierAllowsPatients,
	tierAllowsUsers,
	tierHasFeature,
} from "../constants/billing.constants";
import { createMiddlewareLogger } from "../lib/logger";
import { emitSecurityEvent } from "../utils/security-events";

const logger = createMiddlewareLogger("check-subscription");

/**
 * Feature gating middleware factory
 * Checks if tenant's subscription tier includes the required feature
 *
 * @param requiredFeature - Feature name that requires gating
 * @returns Express middleware function
 *
 * @example
 * router.get("/analytics", authenticate, authorize("REPORT:READ"), requireFeature("ADVANCED_ANALYTICS"), controller);
 */
export function requireFeature(requiredFeature: FeatureValue) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			if (!req.user) {
				logger.debug("User not authenticated");
				return res.status(401).json({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			}

			const { tenantId, roles } = req.user;

			// Super admins bypass feature checks
			if (roles.includes("SUPER_ADMIN")) {
				return next();
			}

			if (!tenantId) {
				logger.warn({ userId: req.user.id }, "No tenant associated with user");
				return res.status(403).json({
					code: "NO_TENANT",
					message: "No organization associated with your account",
				});
			}

			const tenant = await Hospital.findById(tenantId).lean();

			if (!tenant) {
				logger.warn({ tenantId }, "Tenant not found");
				return res.status(403).json({
					code: "TENANT_NOT_FOUND",
					message: "Organization not found",
				});
			}

			const currentTier = (tenant.pricingTier || "FREE") as PricingTierValue;

			if (!tierHasFeature(currentTier, requiredFeature)) {
				const minimumTier = getMinimumTierForFeature(requiredFeature);

				logger.warn(
					{
						userId: req.user.id,
						tenantId,
						requiredFeature,
						currentTier,
						minimumTier,
					},
					"Feature access denied - subscription tier insufficient",
				);

				emitSecurityEvent({
					type: "PERMISSION_DENIED",
					severity: "low",
					tenantId,
					userId: req.user.id,
					ip: req.ip,
					userAgent: req.get("user-agent"),
					details: {
						reason: "Feature not in subscription tier",
						requiredFeature,
						currentTier,
						minimumTier,
					},
				});

				return res.status(403).json({
					code: BillingErrorCodes.FEATURE_NOT_AVAILABLE,
					message: `This feature requires ${minimumTier} plan or higher`,
					requiredTier: minimumTier,
					currentTier,
				});
			}

			logger.debug(
				{
					userId: req.user.id,
					tenantId,
					feature: requiredFeature,
					tier: currentTier,
				},
				"Feature access granted",
			);

			next();
		} catch (error) {
			logger.error({ error }, "Feature check error");
			return res.status(500).json({
				code: "INTERNAL_ERROR",
				message: "Feature check failed due to internal error",
			});
		}
	};
}

/**
 * User limit check middleware
 * Checks if tenant can add more users based on their subscription tier
 *
 * @returns Express middleware function
 *
 * @example
 * router.post("/users", authenticate, authorize("USER:CREATE"), checkUserLimit, createUserController);
 */
export function checkUserLimit(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	return checkResourceLimit("users")(req, res, next);
}

/**
 * Patient limit check middleware
 * Checks if tenant can add more patients based on their subscription tier
 *
 * @returns Express middleware function
 *
 * @example
 * router.post("/patients", authenticate, authorize("PATIENT:CREATE"), checkPatientLimit, registerPatientController);
 */
export function checkPatientLimit(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	return checkResourceLimit("patients")(req, res, next);
}

/**
 * Generic resource limit check middleware factory
 */
function checkResourceLimit(resourceType: "users" | "patients") {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			if (!req.user) {
				return res.status(401).json({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			}

			const { tenantId, roles } = req.user;

			// Super admins bypass limit checks
			if (roles.includes("SUPER_ADMIN")) {
				return next();
			}

			if (!tenantId) {
				return res.status(403).json({
					code: "NO_TENANT",
					message: "No organization associated with your account",
				});
			}

			const tenant = await Hospital.findById(tenantId).lean();

			if (!tenant) {
				return res.status(403).json({
					code: "TENANT_NOT_FOUND",
					message: "Organization not found",
				});
			}

			const currentTier = (tenant.pricingTier || "FREE") as PricingTierValue;
			const limits = TIER_LIMITS[currentTier];

			// Get current count
			let currentCount: number;
			let maxAllowed: number;
			let errorCode: string;

			if (resourceType === "users") {
				currentCount = await Staff.countDocuments({
					tenantId,
					status: "ACTIVE",
				});
				maxAllowed = limits.maxUsers;
				errorCode = BillingErrorCodes.USER_LIMIT_REACHED;
			} else {
				currentCount = await Patient.countDocuments({
					tenantId,
					status: { $ne: "INACTIVE" },
				});
				maxAllowed = limits.maxPatients;
				errorCode = BillingErrorCodes.PATIENT_LIMIT_REACHED;
			}

			// Check limit (-1 means unlimited)
			const isWithinLimit =
				resourceType === "users"
					? tierAllowsUsers(currentTier, currentCount)
					: tierAllowsPatients(currentTier, currentCount);

			if (!isWithinLimit) {
				logger.warn(
					{
						userId: req.user.id,
						tenantId,
						resourceType,
						currentCount,
						maxAllowed,
						currentTier,
					},
					"Resource limit reached",
				);

				emitSecurityEvent({
					type: "PERMISSION_DENIED",
					severity: "low",
					tenantId,
					userId: req.user.id,
					ip: req.ip,
					userAgent: req.get("user-agent"),
					details: {
						reason: `${resourceType} limit reached`,
						resourceType,
						currentCount,
						maxAllowed,
						currentTier,
					},
				});

				return res.status(403).json({
					code: errorCode,
					message: `You have reached the maximum number of ${resourceType} (${maxAllowed}) for your ${currentTier} plan. Please upgrade to add more.`,
					currentCount,
					maxAllowed,
					currentTier,
				});
			}

			logger.debug(
				{
					userId: req.user.id,
					tenantId,
					resourceType,
					currentCount,
					maxAllowed,
				},
				"Resource limit check passed",
			);

			next();
		} catch (error) {
			logger.error({ error, resourceType }, "Resource limit check error");
			return res.status(500).json({
				code: "INTERNAL_ERROR",
				message: "Resource limit check failed due to internal error",
			});
		}
	};
}

/**
 * Subscription status check middleware
 * Verifies the tenant has an active subscription or is within grace period
 * FREE tier users bypass this check (no subscription needed)
 *
 * @returns Express middleware function
 *
 * @example
 * router.use(authenticate, checkSubscriptionStatus);
 */
export function checkSubscriptionStatus(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	return (async () => {
		try {
			if (!req.user) {
				return res.status(401).json({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			}

			const { tenantId, roles } = req.user;

			// Super admins bypass subscription checks
			if (roles.includes("SUPER_ADMIN")) {
				return next();
			}

			if (!tenantId) {
				return res.status(403).json({
					code: "NO_TENANT",
					message: "No organization associated with your account",
				});
			}

			const tenant = await Hospital.findById(tenantId).lean();

			if (!tenant) {
				return res.status(403).json({
					code: "TENANT_NOT_FOUND",
					message: "Organization not found",
				});
			}

			const currentTier = (tenant.pricingTier || "FREE") as PricingTierValue;

			// FREE tier doesn't require a subscription
			if (currentTier === "FREE") {
				return next();
			}

			// Check subscription status for paid tiers
			const subscription = await Subscription.findOne({ tenantId }).lean();

			if (!subscription) {
				// No subscription record but has paid tier - allow (could be manual/enterprise setup)
				logger.debug(
					{ tenantId, currentTier },
					"No subscription record for paid tier - allowing access",
				);
				return next();
			}

			const now = new Date();

			switch (subscription.status) {
				case "ACTIVE":
					// Active subscription - all good
					return next();

				case "ON_HOLD":
					// Check if within grace period
					if (subscription.gracePeriodEndsAt) {
						if (now < subscription.gracePeriodEndsAt) {
							// Within grace period - allow access but log warning
							const daysRemaining = Math.ceil(
								(subscription.gracePeriodEndsAt.getTime() - now.getTime()) /
									(1000 * 60 * 60 * 24),
							);

							logger.warn(
								{
									tenantId,
									daysRemaining,
									gracePeriodEndsAt: subscription.gracePeriodEndsAt,
								},
								"Subscription on hold but within grace period",
							);

							// Add grace period info to request for downstream use
							(
								req as Request & { subscriptionWarning?: object }
							).subscriptionWarning = {
								status: "ON_HOLD",
								gracePeriodEndsAt: subscription.gracePeriodEndsAt,
								daysRemaining,
							};

							return next();
						}
					}

					// Grace period expired
					logger.warn(
						{ tenantId, status: subscription.status },
						"Grace period expired - blocking access",
					);

					return res.status(403).json({
						code: BillingErrorCodes.GRACE_PERIOD_EXPIRED,
						message:
							"Your subscription payment is overdue and the grace period has expired. Please update your payment method to continue.",
					});

				case "CANCELLED":
					// Check if still within paid period
					if (
						subscription.currentPeriodEnd &&
						now < subscription.currentPeriodEnd
					) {
						// Still within paid period
						return next();
					}

					logger.warn(
						{ tenantId, status: subscription.status },
						"Subscription cancelled and period ended",
					);

					return res.status(403).json({
						code: BillingErrorCodes.SUBSCRIPTION_EXPIRED,
						message:
							"Your subscription has been cancelled. Please resubscribe to continue using paid features.",
					});

				case "EXPIRED":
					logger.warn(
						{ tenantId, status: subscription.status },
						"Subscription expired",
					);

					return res.status(403).json({
						code: BillingErrorCodes.SUBSCRIPTION_EXPIRED,
						message:
							"Your subscription has expired. Please renew to continue using paid features.",
					});

				case "PENDING":
					// Pending subscription - allow access (payment might be processing)
					logger.debug({ tenantId }, "Subscription pending - allowing access");
					return next();

				default:
					logger.warn(
						{ tenantId, status: subscription.status },
						"Unknown subscription status",
					);
					return next();
			}
		} catch (error) {
			logger.error({ error }, "Subscription status check error");
			return res.status(500).json({
				code: "INTERNAL_ERROR",
				message: "Subscription check failed due to internal error",
			});
		}
	})();
}

/**
 * Calculate grace period end date from when subscription went on hold
 */
export function calculateGracePeriodEnd(onHoldSince: Date): Date {
	const gracePeriodEnd = new Date(onHoldSince);
	gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);
	return gracePeriodEnd;
}

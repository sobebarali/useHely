import { Hospital, Patient, type PricingTierValue, Staff } from "@hms/db";
import { TIER_LIMITS } from "../../../constants/billing.constants";
import { NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { findSubscriptionByTenantId } from "../repositories/shared.billing.repository";
import type { SubscriptionOutput } from "../validations/subscription.billing.validation";

const logger = createServiceLogger("getSubscription");

/**
 * Get current subscription details for a tenant
 */
export async function getSubscriptionService({
	tenantId,
}: {
	tenantId: string;
}): Promise<SubscriptionOutput> {
	logger.info({ tenantId }, "Getting subscription details");

	// Get tenant info
	const tenant = await Hospital.findById(tenantId).lean();

	if (!tenant) {
		throw new NotFoundError("Organization not found", "TENANT_NOT_FOUND");
	}

	const currentTier = (tenant.pricingTier || "FREE") as PricingTierValue;
	const limits = TIER_LIMITS[currentTier];

	// Get subscription record (may not exist for FREE tier)
	const subscription = await findSubscriptionByTenantId({ tenantId });

	// Get current usage counts
	const [userCount, patientCount] = await Promise.all([
		Staff.countDocuments({ tenantId, status: "ACTIVE" }),
		Patient.countDocuments({ tenantId, status: { $ne: "INACTIVE" } }),
	]);

	logger.info(
		{
			tenantId,
			plan: currentTier,
			hasSubscription: !!subscription,
			userCount,
			patientCount,
		},
		"Subscription details retrieved",
	);

	return {
		id: subscription?._id || null,
		tenantId,
		status:
			subscription?.status || (currentTier === "FREE" ? "ACTIVE" : "NONE"),
		plan: currentTier,
		billingCycle: subscription?.billingCycle || null,
		currentPeriodStart: subscription?.currentPeriodStart?.toISOString() || null,
		currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() || null,
		cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
		trialEndsAt: subscription?.trialEndsAt?.toISOString() || null,
		dodoCustomerId: tenant.dodoCustomerId || null,
		dodoSubscriptionId: subscription?.dodoSubscriptionId || null,
		usage: {
			users: {
				current: userCount,
				max: limits.maxUsers,
				unlimited: limits.maxUsers === -1,
			},
			patients: {
				current: patientCount,
				max: limits.maxPatients,
				unlimited: limits.maxPatients === -1,
			},
		},
		features: limits.features as unknown as string[],
	};
}

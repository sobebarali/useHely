import { Hospital } from "@hms/db";
import type { NextFunction, Request, Response } from "express";
import { createMiddlewareLogger } from "../lib/logger";
import { hasPermission, type Permission } from "../lib/permissions";

const logger = createMiddlewareLogger("authorize");

/**
 * RBAC Authorization middleware factory
 * Checks if the authenticated user has the required permission
 *
 * @param requiredPermission - The RESOURCE:ACTION permission required
 * @returns Express middleware function
 *
 * @example
 * router.get("/patients", authenticate, authorize("PATIENT:READ"), listPatientsController);
 */
export function authorize(requiredPermission: Permission) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			// Check if user is authenticated
			if (!req.user) {
				logger.debug("User not authenticated");
				return res.status(401).json({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			}

			const { permissions, tenantId, roles } = req.user;

			// Check RBAC permission
			if (!hasPermission(permissions, requiredPermission)) {
				logger.warn(
					{
						userId: req.user.id,
						requiredPermission,
						userPermissions: permissions,
					},
					"Permission denied - insufficient permissions",
				);

				return res.status(403).json({
					code: "PERMISSION_DENIED",
					message: `You do not have permission to perform this action: ${requiredPermission}`,
				});
			}

			// Check tenant is active (if user has a tenant)
			if (tenantId) {
				const tenant = await Hospital.findById(tenantId).lean();

				if (!tenant) {
					logger.warn({ tenantId }, "Tenant not found");
					return res.status(403).json({
						code: "TENANT_INACTIVE",
						message: "Your organization is not found",
					});
				}

				if (tenant.status !== "ACTIVE" && tenant.status !== "VERIFIED") {
					logger.warn(
						{ tenantId, status: tenant.status },
						"Tenant is not active",
					);
					return res.status(403).json({
						code: "TENANT_INACTIVE",
						message: "Your organization is not active. Please contact support.",
					});
				}
			}

			logger.debug(
				{
					userId: req.user.id,
					permission: requiredPermission,
					roles,
				},
				"Authorization successful",
			);

			next();
		} catch (error) {
			logger.error({ error }, "Authorization error");
			return res.status(500).json({
				code: "INTERNAL_ERROR",
				message: "Authorization failed due to internal error",
			});
		}
	};
}

/**
 * Authorize multiple permissions (OR logic - user needs at least one)
 *
 * @param requiredPermissions - Array of permissions, user needs at least one
 * @returns Express middleware function
 *
 * @example
 * router.get("/reports", authenticate, authorizeAny(["REPORT:READ", "REPORT:MANAGE"]), getReportsController);
 */
export function authorizeAny(requiredPermissions: Permission[]) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			if (!req.user) {
				logger.debug("User not authenticated");
				return res.status(401).json({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			}

			const { permissions, tenantId } = req.user;

			// Check if user has any of the required permissions
			const hasAnyPermission = requiredPermissions.some((perm) =>
				hasPermission(permissions, perm),
			);

			if (!hasAnyPermission) {
				logger.warn(
					{
						userId: req.user.id,
						requiredPermissions,
						userPermissions: permissions,
					},
					"Permission denied - none of required permissions found",
				);

				return res.status(403).json({
					code: "PERMISSION_DENIED",
					message: "You do not have permission to perform this action",
				});
			}

			// Check tenant is active
			if (tenantId) {
				const tenant = await Hospital.findById(tenantId).lean();

				if (
					!tenant ||
					(tenant.status !== "ACTIVE" && tenant.status !== "VERIFIED")
				) {
					return res.status(403).json({
						code: "TENANT_INACTIVE",
						message: "Your organization is not active",
					});
				}
			}

			next();
		} catch (error) {
			logger.error({ error }, "Authorization error");
			return res.status(500).json({
				code: "INTERNAL_ERROR",
				message: "Authorization failed due to internal error",
			});
		}
	};
}

/**
 * Authorize all permissions (AND logic - user needs all)
 *
 * @param requiredPermissions - Array of permissions, user needs all of them
 * @returns Express middleware function
 *
 * @example
 * router.delete("/patients/:id", authenticate, authorizeAll(["PATIENT:READ", "PATIENT:DELETE"]), deletePatientController);
 */
export function authorizeAll(requiredPermissions: Permission[]) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			if (!req.user) {
				logger.debug("User not authenticated");
				return res.status(401).json({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			}

			const { permissions, tenantId } = req.user;

			// Check if user has all required permissions
			const missingPermissions = requiredPermissions.filter(
				(perm) => !hasPermission(permissions, perm),
			);

			if (missingPermissions.length > 0) {
				logger.warn(
					{
						userId: req.user.id,
						requiredPermissions,
						missingPermissions,
						userPermissions: permissions,
					},
					"Permission denied - missing required permissions",
				);

				return res.status(403).json({
					code: "PERMISSION_DENIED",
					message: "You do not have all required permissions for this action",
				});
			}

			// Check tenant is active
			if (tenantId) {
				const tenant = await Hospital.findById(tenantId).lean();

				if (
					!tenant ||
					(tenant.status !== "ACTIVE" && tenant.status !== "VERIFIED")
				) {
					return res.status(403).json({
						code: "TENANT_INACTIVE",
						message: "Your organization is not active",
					});
				}
			}

			next();
		} catch (error) {
			logger.error({ error }, "Authorization error");
			return res.status(500).json({
				code: "INTERNAL_ERROR",
				message: "Authorization failed due to internal error",
			});
		}
	};
}

/**
 * ABAC Policy evaluation middleware factory
 * Checks attribute-based conditions after RBAC check
 *
 * @param policy - Function that evaluates ABAC policy
 * @returns Express middleware function
 *
 * @example
 * // Only allow doctors to view patients in their department
 * router.get("/patients/:id", authenticate, authorize("PATIENT:READ"), abacPolicy(async (req) => {
 *   const patient = await Patient.findById(req.params.id);
 *   return req.user.attributes?.department === patient?.departmentId;
 * }), getPatientController);
 */
export function abacPolicy(
	policy: (req: Request) => Promise<boolean> | boolean,
) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			if (!req.user) {
				return res.status(401).json({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			}

			const policyResult = await policy(req);

			if (!policyResult) {
				logger.warn(
					{
						userId: req.user.id,
						path: req.path,
						method: req.method,
					},
					"ABAC policy denied access",
				);

				return res.status(403).json({
					code: "POLICY_DENIED",
					message: "Access denied by policy",
				});
			}

			next();
		} catch (error) {
			logger.error({ error }, "ABAC policy evaluation error");
			return res.status(500).json({
				code: "INTERNAL_ERROR",
				message: "Policy evaluation failed",
			});
		}
	};
}

/**
 * Check if user has specific role(s)
 *
 * @param requiredRoles - Role name(s) to check
 * @returns Express middleware function
 */
export function requireRole(requiredRoles: string | string[]) {
	const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

	return (req: Request, res: Response, next: NextFunction) => {
		if (!req.user) {
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Authentication required",
			});
		}

		const hasRole = roles.some((role) => req.user?.roles.includes(role));

		if (!hasRole) {
			logger.warn(
				{
					userId: req.user.id,
					requiredRoles: roles,
					userRoles: req.user.roles,
				},
				"Role check failed",
			);

			return res.status(403).json({
				code: "PERMISSION_DENIED",
				message: "You do not have the required role for this action",
			});
		}

		next();
	};
}

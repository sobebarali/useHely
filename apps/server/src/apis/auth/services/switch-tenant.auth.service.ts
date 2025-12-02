import { randomBytes } from "node:crypto";
import { TOKEN_CONFIG } from "../../../constants";
import {
	AccountLockedError,
	BadRequestError,
	PasswordExpiredError,
	TenantInactiveError,
} from "../../../errors";
import { cacheSession, revokeToken } from "../../../lib/cache/auth.cache";
import { createServiceLogger } from "../../../lib/logger";
import { findHospitalById } from "../../hospital/repositories/shared.hospital.repository";
import {
	findStaffByUserAndTenant,
	getRolesByIds,
} from "../../users/repositories/shared.users.repository";
import {
	createSession,
	deleteSessionByToken,
} from "../repositories/shared.auth.repository";
import type {
	SwitchTenantInput,
	SwitchTenantOutput,
} from "../validations/switch-tenant.auth.validation";

const logger = createServiceLogger("switchTenantAuth");

/**
 * Switch to a different tenant for the authenticated user
 *
 * This allows users who belong to multiple organizations to switch
 * their active tenant context without re-authenticating with password.
 *
 * The operation:
 * 1. Validates user has access to target tenant (Staff record exists)
 * 2. Validates target tenant is active
 * 3. Validates user's Staff status in target tenant is ACTIVE
 * 4. Revokes current access token
 * 5. Issues new tokens scoped to the target tenant
 */
export async function switchTenant({
	data,
	userId,
	currentToken,
	ipAddress,
	userAgent,
}: {
	data: SwitchTenantInput;
	userId: string;
	currentToken: string;
	ipAddress?: string;
	userAgent?: string;
}): Promise<SwitchTenantOutput> {
	const { tenant_id: targetTenantId } = data;

	logger.info({ userId, targetTenantId }, "Tenant switch attempt");

	// Validate target tenant exists and is active
	const hospital = await findHospitalById({ hospitalId: targetTenantId });

	if (!hospital) {
		logger.warn({ userId, targetTenantId }, "Target tenant not found");
		throw new BadRequestError(
			"Organization not found",
			"ORGANIZATION_NOT_FOUND",
		);
	}

	if (hospital.status !== "ACTIVE" && hospital.status !== "VERIFIED") {
		logger.warn(
			{ userId, targetTenantId, status: hospital.status },
			"Target tenant is not active",
		);
		throw new TenantInactiveError(
			"The target organization is not active. Please contact support.",
		);
	}

	// Validate user has Staff record in target tenant
	const staff = await findStaffByUserAndTenant({
		userId,
		tenantId: targetTenantId,
	});

	if (!staff) {
		logger.warn(
			{ userId, targetTenantId },
			"User not associated with target tenant",
		);
		throw new TenantInactiveError(
			"You are not associated with this organization",
		);
	}

	// Validate Staff status
	if (staff.status !== "ACTIVE") {
		logger.warn(
			{ userId, staffId: staff._id, status: staff.status },
			"Staff not active in target tenant",
		);

		if (staff.status === "PASSWORD_EXPIRED") {
			throw new PasswordExpiredError();
		}

		if (staff.status === "LOCKED") {
			throw new AccountLockedError();
		}

		throw new AccountLockedError(
			"Your account is not active in this organization. Please contact your administrator.",
		);
	}

	// Get roles and permissions for the target tenant
	const roles = staff.roles
		? await getRolesByIds({
				tenantId: targetTenantId,
				roleIds: staff.roles as string[],
			})
		: [];

	const roleNames = roles.map((r) => r.name);
	const permissions = roles.flatMap((r) => r.permissions || []);
	const uniquePermissions = [...new Set(permissions)];

	// Revoke current access token
	await revokeToken({ token: currentToken });
	await deleteSessionByToken({ token: currentToken });

	logger.debug({ userId }, "Current token revoked");

	// Generate new tokens for the target tenant
	const accessToken = randomBytes(32).toString("hex");
	const refreshToken = randomBytes(32).toString("hex");

	const accessExpiresAt = new Date(
		Date.now() + TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY * 1000,
	);
	const refreshExpiresAt = new Date(
		Date.now() + TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY * 1000,
	);

	// Create sessions with target tenant
	await createSession({
		userId,
		token: accessToken,
		expiresAt: accessExpiresAt,
		ipAddress,
		userAgent,
		tenantId: targetTenantId,
	});

	await createSession({
		userId,
		token: refreshToken,
		expiresAt: refreshExpiresAt,
		ipAddress,
		userAgent,
		tenantId: targetTenantId,
	});

	// Cache session data for fast lookup
	await cacheSession({
		sessionId: accessToken,
		userId,
		tenantId: targetTenantId,
		roles: roleNames,
		permissions: uniquePermissions,
		expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
	});

	logger.info(
		{
			userId,
			targetTenantId,
			roles: roleNames,
		},
		"Tenant switch successful",
	);

	return {
		access_token: accessToken,
		token_type: "Bearer",
		expires_in: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
		refresh_token: refreshToken,
		refresh_expires_in: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY,
		tenant: {
			id: targetTenantId,
			name: hospital.name,
		},
	};
}

import { randomBytes } from "node:crypto";
import { TOKEN_CONFIG } from "../../../constants";
import {
	AccountLockedError,
	InvalidCredentialsError,
	InvalidGrantError,
	InvalidTokenError,
	PasswordExpiredError,
	TenantInactiveError,
} from "../../../errors";
import {
	cacheSession,
	clearFailedLogins,
	isAccountLocked,
	recordFailedLogin,
	revokeToken,
} from "../../../lib/cache/auth.cache";
import { createServiceLogger } from "../../../lib/logger";
import { comparePassword } from "../../../utils/crypto";
import { findHospitalById } from "../../hospital/repositories/shared.hospital.repository";
import {
	findStaffByUserAndTenant,
	findUserByEmail,
	getActiveRolesByIds as getRolesByIds,
} from "../../users/repositories/shared.users.repository";
import {
	createSession,
	deleteSessionByToken,
	findValidSessionByToken as findSessionByToken,
} from "../repositories/shared.auth.repository";
import {
	findAccountByUserId,
	updateStaffLastLogin,
} from "../repositories/token.auth.repository";
import {
	GrantType,
	type PasswordGrantInput,
	type RefreshTokenGrantInput,
	type TokenInput,
	type TokenOutput,
} from "../validations/token.auth.validation";

const logger = createServiceLogger("tokenAuth");

/**
 * Generate access and refresh tokens for OAuth2 token request
 */
export async function generateTokens({
	data,
	ipAddress,
	userAgent,
}: {
	data: TokenInput;
	ipAddress?: string;
	userAgent?: string;
}): Promise<TokenOutput> {
	switch (data.grant_type) {
		case GrantType.PASSWORD:
			return handlePasswordGrant({
				data,
				ipAddress,
				userAgent,
			});

		case GrantType.REFRESH_TOKEN:
			return handleRefreshTokenGrant({
				data,
				ipAddress,
				userAgent,
			});

		case GrantType.AUTHORIZATION_CODE:
			// Not implemented yet - would require OAuth client registration
			throw new InvalidGrantError(
				"Authorization code grant is not yet supported",
			);

		default:
			throw new InvalidGrantError("Unsupported grant type");
	}
}

/**
 * Handle password grant type
 */
async function handlePasswordGrant({
	data,
	ipAddress,
	userAgent,
}: {
	data: PasswordGrantInput;
	ipAddress?: string;
	userAgent?: string;
}): Promise<TokenOutput> {
	const { username, password, tenant_id } = data;

	logger.info(
		{ username: `****@${username.split("@")[1] || "***"}` },
		"Password grant attempt",
	);

	// Check if account is locked
	const locked = await isAccountLocked({ identifier: username });
	if (locked) {
		logger.warn(
			{ username: `****@${username.split("@")[1] || "***"}` },
			"Account is locked",
		);
		throw new AccountLockedError();
	}

	// Check if tenant exists and is active
	const hospital = await findHospitalById({ hospitalId: tenant_id });
	if (!hospital) {
		logger.warn({ tenantId: tenant_id }, "Tenant not found");
		throw new TenantInactiveError("Organization not found");
	}

	if (hospital.status !== "ACTIVE" && hospital.status !== "VERIFIED") {
		logger.warn(
			{ tenantId: tenant_id, status: hospital.status },
			"Tenant is not active",
		);
		throw new TenantInactiveError(
			"Your organization is not active. Please contact support.",
		);
	}

	// Find user by email
	const user = await findUserByEmail({ email: username });
	if (!user) {
		await recordFailedLogin({ identifier: username });
		logger.warn(
			{ username: `****@${username.split("@")[1] || "***"}` },
			"User not found",
		);
		throw new InvalidCredentialsError();
	}

	// Find credential account
	const account = await findAccountByUserId({ userId: String(user._id) });
	if (!account || !account.password) {
		await recordFailedLogin({ identifier: username });
		logger.warn({ userId: user._id }, "No credential account found");
		throw new InvalidCredentialsError();
	}

	// Verify password
	const passwordValid = await comparePassword(password, account.password);
	if (!passwordValid) {
		const { attempts, isLocked } = await recordFailedLogin({
			identifier: username,
		});
		logger.warn(
			{
				userId: user._id,
				attempts,
				isLocked,
			},
			"Invalid password",
		);
		throw new InvalidCredentialsError();
	}

	// Find staff record for this user in the specified tenant
	const staff = await findStaffByUserAndTenant({
		userId: String(user._id),
		tenantId: tenant_id,
	});

	if (!staff) {
		logger.warn(
			{ userId: user._id, tenantId: tenant_id },
			"User not associated with tenant",
		);
		throw new TenantInactiveError(
			"You are not associated with this organization",
		);
	}

	if (staff.status !== "ACTIVE") {
		logger.warn(
			{ staffId: staff._id, status: staff.status },
			"Staff is not active",
		);

		if (staff.status === "PASSWORD_EXPIRED") {
			throw new PasswordExpiredError();
		}

		throw new AccountLockedError(
			"Your account is not active. Please contact your administrator.",
		);
	}

	// Get roles and permissions
	const roles = staff.roles
		? await getRolesByIds({ roleIds: staff.roles as string[] })
		: [];

	const roleNames = roles.map((r) => r.name);
	const permissions = roles.flatMap((r) => r.permissions || []);
	const uniquePermissions = [...new Set(permissions)];

	// Generate tokens
	const accessToken = randomBytes(32).toString("hex");
	const refreshToken = randomBytes(32).toString("hex");

	const accessExpiresAt = new Date(
		Date.now() + TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY * 1000,
	);
	const refreshExpiresAt = new Date(
		Date.now() + TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY * 1000,
	);

	// Create sessions in database
	await createSession({
		userId: String(user._id),
		token: accessToken,
		expiresAt: accessExpiresAt,
		ipAddress,
		userAgent,
	});

	await createSession({
		userId: String(user._id),
		token: refreshToken,
		expiresAt: refreshExpiresAt,
		ipAddress,
		userAgent,
	});

	// Cache session data for fast lookup
	await cacheSession({
		sessionId: accessToken,
		userId: String(user._id),
		tenantId: tenant_id,
		roles: roleNames,
		permissions: uniquePermissions,
		expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
	});

	// Clear failed login attempts on successful login
	await clearFailedLogins({ identifier: username });

	// Update last login timestamp
	await updateStaffLastLogin({ staffId: String(staff._id) });

	logger.info(
		{
			userId: user._id,
			tenantId: tenant_id,
			roles: roleNames,
		},
		"Password grant successful",
	);

	return {
		access_token: accessToken,
		token_type: "Bearer",
		expires_in: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
		refresh_token: refreshToken,
		refresh_expires_in: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY,
	};
}

/**
 * Handle refresh token grant type
 */
async function handleRefreshTokenGrant({
	data,
	ipAddress,
	userAgent,
}: {
	data: RefreshTokenGrantInput;
	ipAddress?: string;
	userAgent?: string;
}): Promise<TokenOutput> {
	const { refresh_token } = data;

	logger.debug("Refresh token grant attempt");

	// Find refresh token session
	const session = await findSessionByToken({ token: refresh_token });
	if (!session) {
		logger.warn("Invalid refresh token");
		throw new InvalidTokenError("Invalid or expired refresh token");
	}

	const userId = String(session.userId);

	// Find user's staff records to get tenant and roles
	const { Staff } = await import("@hms/db");
	const staff = await Staff.findOne({ userId }).lean();

	if (!staff) {
		logger.warn({ userId }, "No staff record found for user");
		throw new InvalidTokenError("User not found");
	}

	const tenantId = String(staff.tenantId);

	// Verify tenant is still active
	const hospital = await findHospitalById({ hospitalId: tenantId });
	if (
		!hospital ||
		(hospital.status !== "ACTIVE" && hospital.status !== "VERIFIED")
	) {
		throw new TenantInactiveError("Your organization is not active");
	}

	// Get roles and permissions
	const roles = staff.roles
		? await getRolesByIds({ roleIds: staff.roles as string[] })
		: [];

	const roleNames = roles.map((r) => r.name);
	const permissions = roles.flatMap((r) => r.permissions || []);
	const uniquePermissions = [...new Set(permissions)];

	// Generate new access token
	const accessToken = randomBytes(32).toString("hex");
	const accessExpiresAt = new Date(
		Date.now() + TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY * 1000,
	);

	// Create new access token session
	await createSession({
		userId,
		token: accessToken,
		expiresAt: accessExpiresAt,
		ipAddress,
		userAgent,
	});

	// Cache session data
	await cacheSession({
		sessionId: accessToken,
		userId,
		tenantId,
		roles: roleNames,
		permissions: uniquePermissions,
		expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
	});

	logger.info({ userId, tenantId }, "Refresh token grant successful");

	// Rotate refresh token: revoke old token and issue new one
	const newRefreshToken = randomBytes(32).toString("hex");
	const refreshExpiresAt = new Date(
		Date.now() + TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY * 1000,
	);

	// Delete old refresh token session from database
	await deleteSessionByToken({ token: refresh_token });

	// Revoke old refresh token in cache
	await revokeToken({ token: refresh_token });

	// Create new refresh token session
	await createSession({
		userId,
		token: newRefreshToken,
		expiresAt: refreshExpiresAt,
		ipAddress,
		userAgent,
	});

	// Return new tokens (refresh token is rotated for security)
	return {
		access_token: accessToken,
		token_type: "Bearer",
		expires_in: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
		refresh_token: newRefreshToken,
		refresh_expires_in: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY,
	};
}

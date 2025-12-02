import { randomBytes } from "node:crypto";
import { Staff, User } from "@hms/db";
import { AUTH_CACHE_TTL, TOKEN_CONFIG } from "../../../constants";
import {
	AccountLockedError,
	BadRequestError,
	InvalidCredentialsError,
	InvalidGrantError,
	InvalidTokenError,
	PasswordExpiredError,
	TenantInactiveError,
} from "../../../errors";
import {
	cacheSession,
	clearFailedLogins,
	createMfaChallenge,
	deleteMfaChallenge,
	getMfaChallenge,
	isAccountLocked,
	recordFailedLogin,
	revokeToken,
} from "../../../lib/cache/auth.cache";
import { createServiceLogger } from "../../../lib/logger";
import { comparePassword } from "../../../utils/crypto";
import { decrypt } from "../../../utils/encryption";
import { verifyBackupCode, verifyTotp } from "../../../utils/mfa";
import { emitSecurityEvent } from "../../../utils/security-events";
import { findHospitalById } from "../../hospital/repositories/shared.hospital.repository";
import {
	findStaffByUserAndTenant,
	findUserByEmail,
	findUserById,
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
	type MfaChallengeOutput,
	type MfaGrantInput,
	type PasswordGrantInput,
	type RefreshTokenGrantInput,
	type TokenInput,
	type TokenOutput,
} from "../validations/token.auth.validation";

const logger = createServiceLogger("tokenAuth");

/**
 * Generate access and refresh tokens for OAuth2 token request
 *
 * Returns either tokens or MFA challenge depending on grant type and MFA status
 */
export async function generateTokens({
	data,
	ipAddress,
	userAgent,
}: {
	data: TokenInput;
	ipAddress?: string;
	userAgent?: string;
}): Promise<TokenOutput | MfaChallengeOutput> {
	switch (data.grant_type) {
		case GrantType.PASSWORD:
			return handlePasswordGrant({
				data,
				ipAddress,
				userAgent,
			});

		case GrantType.MFA:
			return handleMfaGrant({
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
 *
 * Returns tokens if MFA not enabled, or MFA challenge if MFA is enabled
 */
async function handlePasswordGrant({
	data,
	ipAddress,
	userAgent,
}: {
	data: PasswordGrantInput;
	ipAddress?: string;
	userAgent?: string;
}): Promise<TokenOutput | MfaChallengeOutput> {
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

	// Check if MFA is enabled for this user
	if (user.mfaConfig?.enabled) {
		logger.info({ userId: user._id }, "MFA enabled - creating challenge");

		// Generate challenge token
		const challengeToken = randomBytes(32).toString("hex");

		// Create MFA challenge in cache
		await createMfaChallenge({
			challengeToken,
			userId: String(user._id),
			tenantId: tenant_id,
		});

		logger.info(
			{ userId: user._id },
			"MFA challenge created - awaiting TOTP verification",
		);

		// Return MFA challenge instead of tokens
		return {
			mfa_required: true,
			challenge_token: challengeToken,
			expires_in: AUTH_CACHE_TTL.MFA_CHALLENGE,
		};
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

		if (staff.status === "LOCKED") {
			throw new AccountLockedError();
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
		tenantId: tenant_id,
	});

	await createSession({
		userId: String(user._id),
		token: refreshToken,
		expiresAt: refreshExpiresAt,
		ipAddress,
		userAgent,
		tenantId: tenant_id,
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
 * Handle MFA grant type
 *
 * Verifies TOTP code and issues tokens if valid
 */
async function handleMfaGrant({
	data,
	ipAddress,
	userAgent,
}: {
	data: MfaGrantInput;
	ipAddress?: string;
	userAgent?: string;
}): Promise<TokenOutput> {
	const { challenge_token, code } = data;

	logger.info("MFA grant attempt");

	// Retrieve MFA challenge from cache
	const challenge = await getMfaChallenge({ challengeToken: challenge_token });

	if (!challenge) {
		logger.warn("Invalid or expired MFA challenge token");
		throw new BadRequestError(
			"Invalid or expired MFA challenge. Please start login again.",
			"INVALID_MFA_CHALLENGE",
		);
	}

	const { userId, tenantId } = challenge;

	// Find user
	const user = await findUserById({ userId });

	if (!user) {
		logger.warn({ userId }, "User not found for MFA challenge");
		throw new InvalidCredentialsError();
	}

	// Check if MFA is still enabled
	if (!user.mfaConfig?.enabled || !user.mfaConfig?.secret) {
		logger.warn({ userId }, "MFA not enabled for user");
		await deleteMfaChallenge({ challengeToken: challenge_token });
		throw new BadRequestError(
			"Multi-factor authentication is not enabled",
			"MFA_NOT_ENABLED",
		);
	}

	// Decrypt TOTP secret for verification
	const masterKey = process.env.ENCRYPTION_MASTER_KEY;
	if (!masterKey) {
		logger.error("ENCRYPTION_MASTER_KEY not configured");
		throw new Error("Encryption key not configured");
	}

	let decryptedSecret: string;
	try {
		decryptedSecret = decrypt(user.mfaConfig.secret, masterKey);
	} catch (error) {
		logger.error({ error }, "Failed to decrypt MFA secret");
		throw new Error("Failed to decrypt MFA secret");
	}

	// Verify TOTP code
	const isValidTotp = verifyTotp({
		secret: decryptedSecret,
		code,
	});

	// If TOTP fails, try backup codes
	let isValidBackupCode = false;
	let usedBackupCodeIndex = -1;

	if (!isValidTotp && user.mfaConfig.backupCodes) {
		// Check each backup code
		for (let i = 0; i < user.mfaConfig.backupCodes.length; i++) {
			const hashedCode = user.mfaConfig.backupCodes[i];
			if (hashedCode) {
				const isValid = await verifyBackupCode({
					code,
					hashedCode,
				});
				if (isValid) {
					isValidBackupCode = true;
					usedBackupCodeIndex = i;
					break;
				}
			}
		}
	}

	if (!isValidTotp && !isValidBackupCode) {
		logger.warn({ userId }, "Invalid MFA code");

		// Emit security event
		emitSecurityEvent({
			type: "MFA_FAILED",
			severity: "medium",
			tenantId,
			userId,
			ip: ipAddress,
			userAgent,
			details: {
				reason: "Invalid TOTP or backup code during login",
			},
		});

		throw new BadRequestError(
			"Invalid authentication code. Please try again.",
			"INVALID_MFA_CODE",
		);
	}

	// If backup code was used, remove it from the list
	if (isValidBackupCode && usedBackupCodeIndex >= 0) {
		logger.info({ userId }, "Backup code used - removing from list");

		const updatedBackupCodes = [...(user.mfaConfig.backupCodes || [])];
		updatedBackupCodes.splice(usedBackupCodeIndex, 1);

		await User.findByIdAndUpdate(userId, {
			$set: {
				"mfaConfig.backupCodes": updatedBackupCodes,
			},
		});
	}

	// Delete MFA challenge (one-time use)
	await deleteMfaChallenge({ challengeToken: challenge_token });

	// Find staff record
	const staff = await findStaffByUserAndTenant({
		userId,
		tenantId,
	});

	if (!staff) {
		logger.warn({ userId, tenantId }, "User not associated with tenant");
		throw new TenantInactiveError(
			"You are not associated with this organization",
		);
	}

	if (staff.status !== "ACTIVE") {
		logger.warn(
			{ staffId: staff._id, status: staff.status },
			"Staff not active",
		);

		if (staff.status === "PASSWORD_EXPIRED") {
			throw new PasswordExpiredError();
		}

		if (staff.status === "LOCKED") {
			throw new AccountLockedError();
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

	// Create sessions
	await createSession({
		userId,
		token: accessToken,
		expiresAt: accessExpiresAt,
		ipAddress,
		userAgent,
		tenantId,
	});

	await createSession({
		userId,
		token: refreshToken,
		expiresAt: refreshExpiresAt,
		ipAddress,
		userAgent,
		tenantId,
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

	// Clear failed login attempts
	await clearFailedLogins({ identifier: user.email });

	// Update last login
	await updateStaffLastLogin({ staffId: String(staff._id) });

	logger.info(
		{
			userId,
			tenantId,
			roles: roleNames,
			mfaMethod: isValidBackupCode ? "backup_code" : "totp",
		},
		"MFA grant successful",
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

	// Get tenantId from session (stored at login time)
	// Fall back to Staff lookup for backward compatibility with sessions created before this fix
	let tenantId: string;

	if (session.tenantId) {
		// Use stored tenantId - this is the correct behavior
		tenantId = String(session.tenantId);
		logger.debug({ userId, tenantId }, "Using tenantId from session");
	} else {
		// Backward compatibility: find staff record if session doesn't have tenantId
		// This handles old sessions created before the tenantId field was added
		logger.warn(
			{ userId },
			"Session missing tenantId - falling back to Staff lookup (legacy session)",
		);
		const staff = await Staff.findOne({ userId }).lean();

		if (!staff) {
			logger.warn({ userId }, "No staff record found for user");
			throw new InvalidTokenError("User not found");
		}

		tenantId = String(staff.tenantId);
	}

	// Find staff record for the correct tenant to get roles
	const staff = await findStaffByUserAndTenant({ userId, tenantId });

	if (!staff) {
		logger.warn({ userId, tenantId }, "User not associated with tenant");
		throw new TenantInactiveError(
			"You are no longer associated with this organization",
		);
	}

	if (staff.status !== "ACTIVE") {
		logger.warn(
			{ staffId: staff._id, status: staff.status },
			"Staff not active during refresh",
		);

		if (staff.status === "PASSWORD_EXPIRED") {
			throw new PasswordExpiredError();
		}

		if (staff.status === "LOCKED") {
			throw new AccountLockedError();
		}

		throw new AccountLockedError(
			"Your account is not active. Please contact your administrator.",
		);
	}

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
		tenantId,
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
		tenantId,
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

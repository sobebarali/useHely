import { BadRequestError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { decrypt } from "../../../utils/encryption";
import { verifyTotp } from "../../../utils/mfa";
import { emitSecurityEvent } from "../../../utils/security-events";
import { findUserById } from "../../users/repositories/shared.users.repository";
import { enableUserMfa } from "../repositories/verify-mfa.auth.repository";
import type { VerifyMfaOutput } from "../validations/verify-mfa.auth.validation";

const logger = createServiceLogger("verifyMfa");

/**
 * Verify MFA setup by validating TOTP code
 *
 * Checks the provided TOTP code against the user's secret.
 * If valid, enables MFA for the user.
 *
 * @param params - Service parameters
 * @param params.userId - User ID from JWT
 * @param params.code - 6-digit TOTP code from authenticator app
 * @returns Verification result with enabled status and timestamp
 */
export async function verifyMfa({
	userId,
	code,
}: {
	userId: string;
	code: string;
}): Promise<VerifyMfaOutput> {
	logger.debug({ userId }, "Verifying MFA setup");

	// Get user
	const user = await findUserById({ userId });

	if (!user) {
		logger.warn({ userId }, "User not found");
		throw new NotFoundError("User not found", "USER_NOT_FOUND");
	}

	// Check if MFA is already enabled
	if (user.mfaConfig?.enabled) {
		logger.warn({ userId }, "MFA already enabled for user");
		throw new BadRequestError(
			"Multi-factor authentication is already enabled",
			"MFA_ALREADY_ENABLED",
		);
	}

	// Check if MFA setup has been initiated
	if (!user.mfaConfig?.secret) {
		logger.warn({ userId }, "MFA setup not initiated");
		throw new BadRequestError(
			"MFA setup not initiated. Call /mfa/enable first.",
			"MFA_NOT_CONFIGURED",
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
	const isValid = verifyTotp({
		secret: decryptedSecret,
		code,
	});

	if (!isValid) {
		logger.warn({ userId }, "Invalid TOTP code provided");

		// Emit security event for failed MFA verification
		emitSecurityEvent({
			type: "MFA_FAILED",
			severity: "medium",
			tenantId: null,
			userId,
			details: {
				reason: "Invalid TOTP code during setup verification",
			},
		});

		throw new BadRequestError(
			"Invalid verification code. Please try again.",
			"INVALID_MFA_CODE",
		);
	}

	// Enable MFA
	const updatedUser = await enableUserMfa({ userId });

	if (!updatedUser || !updatedUser.mfaConfig?.verifiedAt) {
		logger.error({ userId }, "Failed to enable MFA");
		throw new NotFoundError("User not found", "USER_NOT_FOUND");
	}

	logger.info({ userId }, "MFA enabled successfully");

	// Emit security event for successful MFA enablement
	emitSecurityEvent({
		type: "MFA_ENABLED",
		severity: "low",
		tenantId: null,
		userId,
		details: {
			verifiedAt: updatedUser.mfaConfig.verifiedAt.toISOString(),
		},
	});

	return {
		enabled: true,
		verifiedAt: updatedUser.mfaConfig.verifiedAt.toISOString(),
	};
}

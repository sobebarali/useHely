import { BadRequestError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
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
		throw new NotFoundError("USER_NOT_FOUND", "User not found");
	}

	// Check if MFA is already enabled
	if (user.mfaConfig?.enabled) {
		logger.warn({ userId }, "MFA already enabled for user");
		throw new BadRequestError(
			"MFA_ALREADY_ENABLED",
			"Multi-factor authentication is already enabled",
		);
	}

	// Check if MFA setup has been initiated
	if (!user.mfaConfig?.secret) {
		logger.warn({ userId }, "MFA setup not initiated");
		throw new BadRequestError(
			"MFA_NOT_CONFIGURED",
			"MFA setup not initiated. Call /mfa/enable first.",
		);
	}

	// Verify TOTP code
	const isValid = verifyTotp({
		secret: user.mfaConfig.secret,
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
			"INVALID_MFA_CODE",
			"Invalid verification code. Please try again.",
		);
	}

	// Enable MFA
	const updatedUser = await enableUserMfa({ userId });

	if (!updatedUser || !updatedUser.mfaConfig?.verifiedAt) {
		logger.error({ userId }, "Failed to enable MFA");
		throw new NotFoundError("USER_NOT_FOUND", "User not found");
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

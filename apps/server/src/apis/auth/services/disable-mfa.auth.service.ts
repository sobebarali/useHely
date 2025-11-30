import { BadRequestError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { emitSecurityEvent } from "../../../utils/security-events";
import { findUserById } from "../../users/repositories/shared.users.repository";
import { disableUserMfa } from "../repositories/disable-mfa.auth.repository";
import type { DisableMfaOutput } from "../validations/disable-mfa.auth.validation";

const logger = createServiceLogger("disableMfa");

/**
 * Disable MFA for a user
 *
 * Removes all MFA configuration including secret and backup codes.
 * User will need to set up MFA again from scratch if they want to re-enable it.
 *
 * @param params - Service parameters
 * @param params.userId - User ID from JWT
 * @returns Confirmation of MFA being disabled
 */
export async function disableMfa({
	userId,
}: {
	userId: string;
}): Promise<DisableMfaOutput> {
	logger.debug({ userId }, "Disabling MFA for user");

	// Get user
	const user = await findUserById({ userId });

	if (!user) {
		logger.warn({ userId }, "User not found");
		throw new NotFoundError("USER_NOT_FOUND", "User not found");
	}

	// Check if MFA is enabled
	if (!user.mfaConfig?.enabled) {
		logger.warn({ userId }, "MFA not enabled for user");
		throw new BadRequestError(
			"MFA_NOT_ENABLED",
			"Multi-factor authentication is not enabled",
		);
	}

	// Disable MFA
	const updatedUser = await disableUserMfa({ userId });

	if (!updatedUser) {
		logger.error({ userId }, "Failed to disable MFA");
		throw new NotFoundError("USER_NOT_FOUND", "User not found");
	}

	logger.info({ userId }, "MFA disabled successfully");

	// Emit security event for MFA being disabled
	emitSecurityEvent({
		type: "MFA_DISABLED",
		severity: "medium",
		tenantId: null,
		userId,
		details: {
			disabledAt: new Date().toISOString(),
		},
	});

	return {
		disabled: true,
		message:
			"Multi-factor authentication has been disabled. You can re-enable it anytime.",
	};
}

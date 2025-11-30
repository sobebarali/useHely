import { ConflictError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import {
	generateBackupCodes,
	generateQrCodeDataUrl,
	generateTotpSecret,
	hashBackupCode,
} from "../../../utils/mfa";
import { findUserById } from "../../users/repositories/shared.users.repository";
import { updateUserMfaConfig } from "../repositories/enable-mfa.auth.repository";
import type { EnableMfaOutput } from "../validations/enable-mfa.auth.validation";

const logger = createServiceLogger("enableMfa");

/**
 * Enable MFA for a user
 *
 * Generates TOTP secret, QR code, and backup codes.
 * Stores hashed backup codes and secret in database.
 * Returns plain text values to user for setup.
 *
 * @param params - Service parameters
 * @param params.userId - User ID from JWT
 * @returns MFA setup data (secret, QR code, backup codes)
 */
export async function enableMfa({
	userId,
}: {
	userId: string;
}): Promise<EnableMfaOutput> {
	logger.debug({ userId }, "Enabling MFA for user");

	// Get user
	const user = await findUserById({ userId });

	if (!user) {
		logger.warn({ userId }, "User not found");
		throw new NotFoundError("USER_NOT_FOUND", "User not found");
	}

	// Check if MFA is already enabled
	if (user.mfaConfig?.enabled) {
		logger.warn({ userId }, "MFA already enabled for user");
		throw new ConflictError(
			"MFA_ALREADY_ENABLED",
			"Multi-factor authentication is already enabled. Disable it first to reconfigure.",
		);
	}

	// Generate TOTP secret (base32-encoded)
	const secret = generateTotpSecret();

	// Generate QR code for authenticator apps
	const qrCodeDataUrl = await generateQrCodeDataUrl({
		secret,
		email: user.email,
		issuer: "Hospital Management System",
	});

	// Generate backup codes
	const backupCodes = generateBackupCodes(10);

	// Hash backup codes for storage
	const hashedBackupCodes = await Promise.all(
		backupCodes.map((code) => hashBackupCode(code)),
	);

	// Update user with MFA configuration
	const updatedUser = await updateUserMfaConfig({
		userId,
		secret,
		hashedBackupCodes,
	});

	if (!updatedUser) {
		logger.error({ userId }, "Failed to update user MFA configuration");
		throw new NotFoundError("USER_NOT_FOUND", "User not found");
	}

	logger.info({ userId }, "MFA configuration created (not yet enabled)");

	return {
		secret,
		qrCodeDataUrl,
		backupCodes, // Return plain text codes for user to save
	};
}

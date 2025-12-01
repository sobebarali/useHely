import { ConflictError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { encrypt } from "../../../utils/encryption";
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
		throw new NotFoundError("User not found", "USER_NOT_FOUND");
	}

	// Check if MFA is already enabled
	if (user.mfaConfig?.enabled) {
		logger.warn({ userId }, "MFA already enabled for user");
		throw new ConflictError(
			"Multi-factor authentication is already enabled. Disable it first to reconfigure.",
			"MFA_ALREADY_ENABLED",
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

	// Encrypt TOTP secret before storage for security
	const masterKey = process.env.ENCRYPTION_MASTER_KEY;
	if (!masterKey) {
		logger.error("ENCRYPTION_MASTER_KEY not configured");
		throw new Error("Encryption key not configured");
	}
	const encryptedSecret = encrypt(secret, masterKey);

	// Update user with MFA configuration (store encrypted secret)
	const updatedUser = await updateUserMfaConfig({
		userId,
		secret: encryptedSecret,
		hashedBackupCodes,
	});

	if (!updatedUser) {
		logger.error({ userId }, "Failed to update user MFA configuration");
		throw new NotFoundError("User not found", "USER_NOT_FOUND");
	}

	logger.info({ userId }, "MFA configuration created (not yet enabled)");

	return {
		secret,
		qrCodeDataUrl,
		backupCodes, // Return plain text codes for user to save
	};
}

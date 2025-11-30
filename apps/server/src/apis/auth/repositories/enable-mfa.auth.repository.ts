import { User } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("enableMfa");

/**
 * Update user with MFA configuration
 *
 * Stores the TOTP secret and hashed backup codes in the user document.
 * MFA is not enabled yet (enabled: false) - user must verify TOTP first.
 */
export async function updateUserMfaConfig({
	userId,
	secret,
	hashedBackupCodes,
}: {
	userId: string;
	secret: string;
	hashedBackupCodes: string[];
}) {
	try {
		logger.debug({ userId }, "Updating user MFA configuration");

		const user = await User.findByIdAndUpdate(
			userId,
			{
				$set: {
					mfaConfig: {
						enabled: false, // Not enabled until user verifies TOTP code
						secret,
						backupCodes: hashedBackupCodes,
						verifiedAt: null,
					},
				},
				updatedAt: new Date(),
			},
			{ new: true },
		);

		logDatabaseOperation(
			logger,
			"findByIdAndUpdate",
			"user",
			{ _id: userId },
			user ? { _id: user._id, mfaConfigured: true } : { found: false },
		);

		return user;
	} catch (error) {
		logError(logger, error, "Failed to update user MFA configuration");
		throw error;
	}
}

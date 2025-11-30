import { User } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("verifyMfa");

/**
 * Enable MFA for user after successful TOTP verification
 *
 * Sets mfaConfig.enabled to true and records verification timestamp.
 */
export async function enableUserMfa({ userId }: { userId: string }) {
	try {
		logger.debug({ userId }, "Enabling MFA for user");

		const now = new Date();

		const user = await User.findByIdAndUpdate(
			userId,
			{
				$set: {
					"mfaConfig.enabled": true,
					"mfaConfig.verifiedAt": now,
				},
				updatedAt: now,
			},
			{ new: true },
		);

		logDatabaseOperation(
			logger,
			"findByIdAndUpdate",
			"user",
			{ _id: userId },
			user ? { _id: user._id, mfaEnabled: true } : { found: false },
		);

		return user;
	} catch (error) {
		logError(logger, error, "Failed to enable user MFA");
		throw error;
	}
}

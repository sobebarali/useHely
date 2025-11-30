import { User } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("disableMfa");

/**
 * Disable MFA for user
 *
 * Removes all MFA configuration including secret and backup codes.
 */
export async function disableUserMfa({ userId }: { userId: string }) {
	try {
		logger.debug({ userId }, "Disabling MFA for user");

		const user = await User.findByIdAndUpdate(
			userId,
			{
				$unset: {
					mfaConfig: "",
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
			user ? { _id: user._id, mfaDisabled: true } : { found: false },
		);

		return user;
	} catch (error) {
		logError(logger, error, "Failed to disable user MFA");
		throw error;
	}
}

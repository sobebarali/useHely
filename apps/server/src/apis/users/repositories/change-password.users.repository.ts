import { Account } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("changePassword");

/**
 * Find account by user ID for password verification
 */
export async function findAccountByUserId({ userId }: { userId: string }) {
	try {
		logger.debug({ userId }, "Finding account by user ID");

		const account = await Account.findOne({
			userId,
			providerId: "credential",
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"account",
			{ userId },
			account ? { found: true } : { found: false },
		);

		return account;
	} catch (error) {
		logError(logger, error, "Failed to find account by user ID");
		throw error;
	}
}

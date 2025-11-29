import { Session } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("revokeAuth");

/**
 * Find session by token
 */
export async function findSessionByToken({ token }: { token: string }) {
	try {
		logger.debug("Finding session by token");

		const session = await Session.findOne({ token }).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"session",
			{},
			session ? { _id: session._id, found: true } : { found: false },
		);

		return session;
	} catch (error) {
		logError(logger, error, "Failed to find session by token");
		throw error;
	}
}

/**
 * Delete session by ID
 */
export async function deleteSessionById({ sessionId }: { sessionId: string }) {
	try {
		logger.debug({ sessionId }, "Deleting session by ID");

		const result = await Session.deleteOne({ _id: sessionId });

		logDatabaseOperation(
			logger,
			"deleteOne",
			"session",
			{ _id: sessionId },
			{ deletedCount: result.deletedCount },
		);

		return result.deletedCount > 0;
	} catch (error) {
		logError(logger, error, "Failed to delete session by ID");
		throw error;
	}
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions({ userId }: { userId: string }) {
	try {
		logger.debug({ userId }, "Deleting all sessions for user");

		const result = await Session.deleteMany({ userId });

		logDatabaseOperation(
			logger,
			"deleteMany",
			"session",
			{ userId },
			{ deletedCount: result.deletedCount },
		);

		logger.info(
			{ userId, deletedCount: result.deletedCount },
			"All user sessions deleted",
		);

		return result.deletedCount;
	} catch (error) {
		logError(logger, error, "Failed to delete all user sessions");
		throw error;
	}
}

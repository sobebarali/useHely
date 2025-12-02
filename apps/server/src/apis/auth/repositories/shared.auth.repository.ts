import { Session } from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("sharedAuth");

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
 * Find valid (non-expired) session by token
 */
export async function findValidSessionByToken({ token }: { token: string }) {
	try {
		logger.debug("Finding valid session by token");

		const session = await Session.findOne({
			token,
			expiresAt: { $gt: new Date() },
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"session",
			{},
			session ? { _id: session._id, found: true } : { found: false },
		);

		return session;
	} catch (error) {
		logError(logger, error, "Failed to find valid session by token");
		throw error;
	}
}

/**
 * Create a new session
 */
export async function createSession({
	userId,
	token,
	expiresAt,
	ipAddress,
	userAgent,
	tenantId,
}: {
	userId: string;
	token: string;
	expiresAt: Date;
	ipAddress?: string;
	userAgent?: string;
	tenantId?: string;
}) {
	try {
		logger.debug({ userId, tenantId }, "Creating session");

		const session = await Session.create({
			_id: uuidv4(),
			userId,
			token,
			expiresAt,
			ipAddress,
			userAgent,
			tenantId,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		logDatabaseOperation(
			logger,
			"create",
			"session",
			{ userId, tenantId },
			{ _id: session._id },
		);

		logger.info(
			{ sessionId: session._id, userId, tenantId },
			"Session created",
		);

		return session;
	} catch (error) {
		logError(logger, error, "Failed to create session");
		throw error;
	}
}

/**
 * Delete session by token
 */
export async function deleteSessionByToken({ token }: { token: string }) {
	try {
		logger.debug("Deleting session by token");

		const result = await Session.deleteOne({ token });

		logDatabaseOperation(
			logger,
			"deleteOne",
			"session",
			{},
			{ deletedCount: result.deletedCount },
		);

		return result.deletedCount > 0;
	} catch (error) {
		logError(logger, error, "Failed to delete session");
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
		logger.debug({ userId }, "Deleting all user sessions");

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

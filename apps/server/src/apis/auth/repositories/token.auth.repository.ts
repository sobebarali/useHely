import { Account, Hospital, Role, Session, Staff, User } from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("tokenAuth");

/**
 * Find user by email
 */
export async function findUserByEmail({ email }: { email: string }) {
	try {
		logger.debug(
			{ email: `****@${email.split("@")[1]}` },
			"Finding user by email",
		);

		const user = await User.findOne({ email }).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"user",
			{ email: `****@${email.split("@")[1]}` },
			user ? { _id: user._id, found: true } : { found: false },
		);

		return user;
	} catch (error) {
		logError(logger, error, "Failed to find user by email");
		throw error;
	}
}

/**
 * Find account by user ID and provider (for password verification)
 */
export async function findAccountByUserId({
	userId,
	providerId = "credential",
}: {
	userId: string;
	providerId?: string;
}) {
	try {
		logger.debug({ userId, providerId }, "Finding account by user ID");

		const account = await Account.findOne({ userId, providerId }).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"account",
			{ userId, providerId },
			account ? { found: true } : { found: false },
		);

		return account;
	} catch (error) {
		logError(logger, error, "Failed to find account by user ID");
		throw error;
	}
}

/**
 * Find staff by user ID and tenant ID
 */
export async function findStaffByUserAndTenant({
	userId,
	tenantId,
}: {
	userId: string;
	tenantId: string;
}) {
	try {
		logger.debug({ userId, tenantId }, "Finding staff by user and tenant");

		const staff = await Staff.findOne({ userId, tenantId }).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"staff",
			{ userId, tenantId },
			staff ? { _id: staff._id, found: true } : { found: false },
		);

		return staff;
	} catch (error) {
		logError(logger, error, "Failed to find staff by user and tenant");
		throw error;
	}
}

/**
 * Get roles by IDs
 */
export async function getRolesByIds({ roleIds }: { roleIds: string[] }) {
	try {
		logger.debug({ roleIds }, "Getting roles by IDs");

		const roles = await Role.find({
			_id: { $in: roleIds },
			isActive: true,
		}).lean();

		logDatabaseOperation(
			logger,
			"find",
			"role",
			{ roleIds },
			{ count: roles.length },
		);

		return roles;
	} catch (error) {
		logError(logger, error, "Failed to get roles by IDs");
		throw error;
	}
}

/**
 * Find hospital/tenant by ID
 */
export async function findHospitalById({ hospitalId }: { hospitalId: string }) {
	try {
		logger.debug({ hospitalId }, "Finding hospital by ID");

		const hospital = await Hospital.findById(hospitalId).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"hospital",
			{ _id: hospitalId },
			hospital
				? { _id: hospital._id, status: hospital.status }
				: { found: false },
		);

		return hospital;
	} catch (error) {
		logError(logger, error, "Failed to find hospital by ID");
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
}: {
	userId: string;
	token: string;
	expiresAt: Date;
	ipAddress?: string;
	userAgent?: string;
}) {
	try {
		logger.debug({ userId }, "Creating session");

		const session = await Session.create({
			_id: uuidv4(),
			userId,
			token,
			expiresAt,
			ipAddress,
			userAgent,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		logDatabaseOperation(
			logger,
			"create",
			"session",
			{ userId },
			{ _id: session._id },
		);

		logger.info({ sessionId: session._id, userId }, "Session created");

		return session;
	} catch (error) {
		logError(logger, error, "Failed to create session");
		throw error;
	}
}

/**
 * Find session by token
 */
export async function findSessionByToken({ token }: { token: string }) {
	try {
		logger.debug("Finding session by token");

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
		logError(logger, error, "Failed to find session by token");
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

/**
 * Update staff last login
 */
export async function updateStaffLastLogin({ staffId }: { staffId: string }) {
	try {
		logger.debug({ staffId }, "Updating staff last login");

		await Staff.updateOne(
			{ _id: staffId },
			{ $set: { lastLogin: new Date(), updatedAt: new Date() } },
		);

		logDatabaseOperation(
			logger,
			"updateOne",
			"staff",
			{ _id: staffId },
			{ lastLogin: "updated" },
		);
	} catch (error) {
		logError(logger, error, "Failed to update staff last login");
		// Don't throw - this is not critical
	}
}

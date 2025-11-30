import { Counter, Department, Role, Session, Staff, User } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("sharedUsers");

// Type for Counter model with static method
interface CounterModel {
	getNextSequence: (tenantId: string, type: string) => Promise<number>;
}

/**
 * Get next employee sequence number using atomic counter
 * This prevents race conditions when creating employees concurrently
 */
export async function getNextEmployeeSequence({
	tenantId,
}: {
	tenantId: string;
}): Promise<number> {
	try {
		logger.debug({ tenantId }, "Getting next employee sequence");

		const seq = await (Counter as unknown as CounterModel).getNextSequence(
			tenantId,
			"employee",
		);

		logDatabaseOperation(
			logger,
			"getNextSequence",
			"counter",
			{ tenantId, type: "employee" },
			{ seq },
		);

		return seq;
	} catch (error) {
		logError(logger, error, "Failed to get next employee sequence");
		throw error;
	}
}

/**
 * Find staff by ID within a tenant
 */
export async function findStaffById({
	tenantId,
	staffId,
}: {
	tenantId: string;
	staffId: string;
}) {
	try {
		logger.debug({ tenantId, staffId }, "Finding staff by ID");

		const staff = await Staff.findOne({
			_id: staffId,
			tenantId,
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"staff",
			{ tenantId, staffId },
			staff ? { _id: staff._id, found: true } : { found: false },
		);

		return staff;
	} catch (error) {
		logError(logger, error, "Failed to find staff by ID");
		throw error;
	}
}

/**
 * Find staff by user ID
 */
export async function findStaffByUserId({ userId }: { userId: string }) {
	try {
		logger.debug({ userId }, "Finding staff by user ID");

		const staff = await Staff.findOne({ userId }).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"staff",
			{ userId },
			staff ? { _id: staff._id, found: true } : { found: false },
		);

		return staff;
	} catch (error) {
		logError(logger, error, "Failed to find staff by user ID");
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
 * Find staff by email within a tenant
 */
export async function findStaffByEmail({
	tenantId,
	email,
}: {
	tenantId: string;
	email: string;
}) {
	try {
		logger.debug({ tenantId, email }, "Checking for existing staff by email");

		// First find user by email
		const user = await User.findOne({ email }).lean();
		if (!user) {
			return null;
		}

		// Then check if user is staff in this tenant
		const staff = await Staff.findOne({
			tenantId,
			userId: String(user._id),
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"staff",
			{ tenantId, email },
			staff ? { _id: staff._id, found: true } : { found: false },
		);

		return staff;
	} catch (error) {
		logError(logger, error, "Failed to check for existing staff by email");
		throw error;
	}
}

/**
 * Find user by email
 */
export async function findUserByEmail({ email }: { email: string }) {
	try {
		logger.debug({ email }, "Finding user by email");

		const user = await User.findOne({ email }).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"user",
			{ email },
			user ? { _id: user._id, found: true } : { found: false },
		);

		return user;
	} catch (error) {
		logError(logger, error, "Failed to find user by email");
		throw error;
	}
}

/**
 * Find user by ID
 */
export async function findUserById({ userId }: { userId: string }) {
	try {
		logger.debug({ userId }, "Finding user by ID");

		const user = await User.findById(userId).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"user",
			{ _id: userId },
			user ? { _id: user._id, found: true } : { found: false },
		);

		return user;
	} catch (error) {
		logError(logger, error, "Failed to find user by ID");
		throw error;
	}
}

/**
 * Find department by ID within a tenant
 */
export async function findDepartmentById({
	tenantId,
	departmentId,
}: {
	tenantId: string;
	departmentId: string;
}) {
	try {
		logger.debug({ tenantId, departmentId }, "Finding department by ID");

		const department = await Department.findOne({
			_id: departmentId,
			tenantId,
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"department",
			{ tenantId, departmentId },
			department ? { _id: department._id, found: true } : { found: false },
		);

		return department;
	} catch (error) {
		logError(logger, error, "Failed to find department");
		throw error;
	}
}

/**
 * Get department by ID (without tenant scope)
 */
export async function getDepartmentById({
	departmentId,
}: {
	departmentId: string;
}) {
	try {
		logger.debug({ departmentId }, "Getting department by ID");

		const department = await Department.findById(departmentId).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"department",
			{ _id: departmentId },
			department ? { _id: department._id, found: true } : { found: false },
		);

		return department;
	} catch (error) {
		logError(logger, error, "Failed to get department by ID");
		throw error;
	}
}

/**
 * Get roles by IDs within a tenant (only active roles)
 */
export async function getRolesByIds({
	tenantId,
	roleIds,
}: {
	tenantId: string;
	roleIds: string[];
}) {
	try {
		logger.debug({ tenantId, roleIds }, "Finding roles by IDs");

		const roles = await Role.find({
			_id: { $in: roleIds },
			tenantId,
			isActive: true,
		}).lean();

		logDatabaseOperation(
			logger,
			"find",
			"role",
			{ tenantId, roleIds },
			{ count: roles.length },
		);

		return roles;
	} catch (error) {
		logError(logger, error, "Failed to find roles");
		throw error;
	}
}

/**
 * Get roles by IDs (without tenant scope, for auth)
 */
export async function getRolesByIdsWithoutTenant({
	roleIds,
}: {
	roleIds: string[];
}) {
	try {
		logger.debug({ roleIds }, "Getting roles by IDs");

		const roles = await Role.find({
			_id: { $in: roleIds },
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
 * Get active roles by IDs (without tenant scope)
 */
export async function getActiveRolesByIds({ roleIds }: { roleIds: string[] }) {
	try {
		logger.debug({ roleIds }, "Getting active roles by IDs");

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
		logError(logger, error, "Failed to get active roles by IDs");
		throw error;
	}
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateUserSessions({ userId }: { userId: string }) {
	try {
		logger.debug({ userId }, "Invalidating user sessions");

		const result = await Session.deleteMany({ userId });

		logDatabaseOperation(
			logger,
			"deleteMany",
			"session",
			{ userId },
			{ deletedCount: result.deletedCount },
		);

		logger.info(
			{ userId, count: result.deletedCount },
			"User sessions invalidated",
		);

		return result.deletedCount;
	} catch (error) {
		logError(logger, error, "Failed to invalidate user sessions", { userId });
		throw error;
	}
}

/**
 * Find multiple staff by IDs within a tenant
 */
export async function findStaffByIds({
	tenantId,
	staffIds,
}: {
	tenantId: string;
	staffIds: string[];
}) {
	try {
		logger.debug({ tenantId, count: staffIds.length }, "Finding staff by IDs");

		const staffList = await Staff.find({
			_id: { $in: staffIds },
			tenantId,
		}).lean();

		logDatabaseOperation(
			logger,
			"find",
			"staff",
			{ tenantId, count: staffIds.length },
			{ found: staffList.length },
		);

		return staffList;
	} catch (error) {
		logError(logger, error, "Failed to find staff by IDs");
		throw error;
	}
}

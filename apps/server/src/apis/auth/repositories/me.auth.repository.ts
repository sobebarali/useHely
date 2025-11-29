import { Department, Role, Staff, User } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("meAuth");

/**
 * Find user by ID with full profile information
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
 * Get roles by IDs with full details
 */
export async function getRolesByIds({ roleIds }: { roleIds: string[] }) {
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
 * Get department by ID
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

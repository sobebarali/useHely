import { Role, Staff, User } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("getUserById");

/**
 * Get staff by ID with user and role information
 */
export async function getStaffById({
	tenantId,
	staffId,
}: {
	tenantId: string;
	staffId: string;
}) {
	try {
		logger.debug({ tenantId, staffId }, "Getting staff by ID");

		const staff = await Staff.findOne({
			_id: staffId,
			tenantId,
		}).lean();

		if (!staff) {
			logDatabaseOperation(
				logger,
				"findOne",
				"staff",
				{ tenantId, staffId },
				{ found: false },
			);
			return null;
		}

		logDatabaseOperation(
			logger,
			"findOne",
			"staff",
			{ tenantId, staffId },
			{ _id: staff._id, found: true },
		);

		// Get user for email
		const user = await User.findById(staff.userId).lean();

		// Get roles with permissions (scoped to tenant for security)
		const roleIds = staff.roles || [];
		const roles = await Role.find({
			_id: { $in: roleIds },
			tenantId,
			isActive: true,
		}).lean();

		logger.info({ staffId, tenantId }, "Staff retrieved");

		return {
			staff,
			user,
			roles,
		};
	} catch (error) {
		logError(logger, error, "Failed to get staff by ID", { tenantId, staffId });
		throw error;
	}
}

import { Role, Staff, User } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("getStaffDepartments");

interface StaffWithDetails {
	_id: string;
	userId: string;
	firstName: string;
	lastName: string;
	email?: string;
	specialization?: string | null;
	status: string;
	createdAt: Date;
	roleName?: string;
}

/**
 * Get staff members in a department with pagination
 */
export async function getStaffByDepartmentId({
	tenantId,
	departmentId,
	page,
	limit,
	role,
	status = "ACTIVE",
}: {
	tenantId: string;
	departmentId: string;
	page: number;
	limit: number;
	role?: string;
	status?: string;
}): Promise<{
	staff: StaffWithDetails[];
	total: number;
}> {
	try {
		logger.debug(
			{ tenantId, departmentId, page, limit, role, status },
			"Getting department staff",
		);

		// Build base query filter
		const filter: Record<string, unknown> = {
			tenantId,
			departmentId,
			status,
		};

		// If role filter is provided, we need to find role ID first
		let roleId: string | null = null;
		if (role) {
			const foundRole = await Role.findOne({
				tenantId,
				name: role,
			}).lean();
			if (foundRole) {
				roleId = String(foundRole._id);
				filter.roles = roleId;
			} else {
				// Role not found, return empty results
				return { staff: [], total: 0 };
			}
		}

		// Get total count with role filter applied
		const total = await Staff.countDocuments(filter);

		// Get paginated results with role filter applied
		const skip = (page - 1) * limit;
		const staffList = await Staff.find(filter)
			.sort({ firstName: 1, lastName: 1 })
			.skip(skip)
			.limit(limit)
			.lean();

		// Get user details for emails
		const userIds = staffList.map((s) => s.userId);
		const users = await User.find({ _id: { $in: userIds } })
			.select("_id email")
			.lean();
		const usersMap = new Map(users.map((u) => [String(u._id), u]));

		// Get role names for display
		const allRoleIds = [...new Set(staffList.flatMap((s) => s.roles || []))];
		const roles = await Role.find({ _id: { $in: allRoleIds } })
			.select("_id name")
			.lean();
		const rolesMap = new Map(roles.map((r) => [String(r._id), r.name]));

		// Combine results
		const staffWithDetails: StaffWithDetails[] = staffList.map((s) => {
			const user = usersMap.get(String(s.userId));
			const primaryRoleId = s.roles?.[0];
			const roleName = primaryRoleId
				? rolesMap.get(String(primaryRoleId))
				: undefined;

			return {
				_id: String(s._id),
				userId: String(s.userId),
				firstName: s.firstName,
				lastName: s.lastName,
				email: user?.email,
				specialization: s.specialization,
				status: s.status,
				createdAt: s.createdAt,
				roleName,
			};
		});

		logDatabaseOperation(
			logger,
			"find",
			"staff",
			{ tenantId, departmentId, page, limit },
			{ total, returned: staffWithDetails.length },
		);

		return {
			staff: staffWithDetails,
			total,
		};
	} catch (error) {
		logError(logger, error, "Failed to get department staff");
		throw error;
	}
}

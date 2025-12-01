import { Department, Role, Staff, User } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("listUsers");

/**
 * List users with pagination and filters
 */
export async function listUsers({
	tenantId,
	page,
	limit,
	department,
	role,
	status,
	search,
	sortBy,
	sortOrder,
}: {
	tenantId: string;
	page: number;
	limit: number;
	department?: string;
	role?: string;
	status?: string;
	search?: string;
	sortBy: string;
	sortOrder: "asc" | "desc";
}) {
	try {
		logger.debug({ tenantId, page, limit }, "Listing users");

		// Build query
		const query: Record<string, unknown> = { tenantId };

		if (department) {
			query.departmentId = department;
		}

		if (role) {
			query.roles = role;
		}

		if (status) {
			query.status = status;
		}

		// For search, we need to search in firstName, lastName
		if (search) {
			query.$or = [
				{ firstName: { $regex: search, $options: "i" } },
				{ lastName: { $regex: search, $options: "i" } },
			];
		}

		// Calculate skip
		const skip = (page - 1) * limit;

		// Build sort
		const sort: Record<string, 1 | -1> = {
			[sortBy]: sortOrder === "asc" ? 1 : -1,
		};

		// Get total count
		const total = await Staff.countDocuments(query);

		// Get staff records
		const staffRecords = await Staff.find(query)
			.sort(sort)
			.skip(skip)
			.limit(limit)
			.lean();

		logDatabaseOperation(
			logger,
			"find",
			"staff",
			{ tenantId, page, limit },
			{ count: staffRecords.length, total },
		);

		// Get user IDs for email lookup
		const userIds = staffRecords.map((s) => s.userId);
		const users = await User.find({ _id: { $in: userIds } }).lean();
		const userMap = new Map(users.map((u) => [String(u._id), u]));

		// Get all unique role IDs
		const roleIds = [...new Set(staffRecords.flatMap((s) => s.roles || []))];
		const roles = await Role.find({ _id: { $in: roleIds } }).lean();
		const roleMap = new Map(roles.map((r) => [String(r._id), r]));

		// Get all unique department IDs
		const departmentIds = [
			...new Set(staffRecords.map((s) => s.departmentId).filter(Boolean)),
		];
		const departments = await Department.find({
			_id: { $in: departmentIds },
		}).lean();
		const departmentMap = new Map(departments.map((d) => [String(d._id), d]));

		// Combine data
		const data = staffRecords.map((staff) => {
			const user = userMap.get(String(staff.userId));
			const staffRoles = (staff.roles || []).map((roleId) => {
				const role = roleMap.get(String(roleId));
				return role
					? { id: String(role._id), name: role.name }
					: { id: String(roleId), name: "Unknown" };
			});
			const department = staff.departmentId
				? departmentMap.get(String(staff.departmentId))
				: null;

			return {
				id: String(staff._id),
				username: `${staff.firstName?.toLowerCase()}.${staff.lastName?.toLowerCase()}`,
				email: user?.email || "",
				firstName: staff.firstName || "",
				lastName: staff.lastName || "",
				department: department?.name || "",
				roles: staffRoles,
				status: staff.status || "ACTIVE",
				createdAt: staff.createdAt?.toISOString() || new Date().toISOString(),
			};
		});

		logger.info({ tenantId, count: data.length, total }, "Users listed");

		return {
			data,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	} catch (error) {
		logError(logger, error, "Failed to list users", { tenantId });
		throw error;
	}
}

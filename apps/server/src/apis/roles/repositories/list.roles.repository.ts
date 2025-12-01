import { Role, Staff } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("listRoles");

interface RoleLean {
	_id: string;
	tenantId: string;
	name: string;
	description?: string;
	permissions: string[];
	isSystem: boolean;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

interface RoleWithUsersCount extends RoleLean {
	usersCount?: number;
}

/**
 * List roles with pagination and filters
 */
export async function listRoles({
	tenantId,
	page,
	limit,
	search,
	isSystem,
	isActive,
	sortBy = "createdAt",
	sortOrder = "desc",
}: {
	tenantId: string;
	page: number;
	limit: number;
	search?: string;
	isSystem?: boolean;
	isActive?: boolean;
	sortBy?: string;
	sortOrder?: string;
}): Promise<{
	roles: RoleWithUsersCount[];
	total: number;
}> {
	try {
		logger.debug(
			{ tenantId, page, limit, search, isSystem, isActive },
			"Listing roles",
		);

		// Build query filter
		const filter: Record<string, unknown> = { tenantId };

		if (isSystem !== undefined) {
			filter.isSystem = isSystem;
		}

		if (isActive !== undefined) {
			filter.isActive = isActive;
		}

		if (search) {
			filter.name = { $regex: search, $options: "i" };
		}

		// Get total count
		const total = await Role.countDocuments(filter);

		// Build sort object
		const sort: Record<string, 1 | -1> = {
			[sortBy]: sortOrder === "asc" ? 1 : -1,
		};

		// Get paginated results
		const skip = (page - 1) * limit;
		const roles = await Role.find(filter)
			.sort(sort)
			.skip(skip)
			.limit(limit)
			.lean();

		// Get user counts for each role
		const roleIds = roles.map((r) => String(r._id));
		const userCounts = await Staff.aggregate([
			{
				$match: {
					tenantId,
					roles: { $in: roleIds },
					status: "ACTIVE",
				},
			},
			{
				$unwind: "$roles",
			},
			{
				$match: {
					roles: { $in: roleIds },
				},
			},
			{
				$group: {
					_id: "$roles",
					count: { $sum: 1 },
				},
			},
		]);

		const userCountsMap = new Map<string, number>(
			userCounts.map((uc) => [uc._id, uc.count]),
		);

		// Combine results
		const rolesWithCounts: RoleWithUsersCount[] = roles.map((r) => ({
			...(r as RoleLean),
			usersCount: userCountsMap.get(String(r._id)) || 0,
		}));

		logDatabaseOperation(
			logger,
			"find",
			"role",
			{ tenantId, page, limit },
			{ total, returned: roles.length },
		);

		return { roles: rolesWithCounts, total };
	} catch (error) {
		logError(logger, error, "Failed to list roles");
		throw error;
	}
}

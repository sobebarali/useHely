import { Department, Staff } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { DepartmentLean } from "./shared.departments.repository";

const logger = createRepositoryLogger("listDepartments");

interface DepartmentWithHead extends DepartmentLean {
	headDetails?: {
		_id: string;
		firstName: string;
		lastName: string;
	} | null;
	staffCount?: number;
}

/**
 * List departments with pagination and filters
 */
export async function listDepartments({
	tenantId,
	page,
	limit,
	type,
	status,
	parentId,
	search,
	includeStaffCount,
}: {
	tenantId: string;
	page: number;
	limit: number;
	type?: string;
	status?: string;
	parentId?: string;
	search?: string;
	includeStaffCount?: boolean;
}): Promise<{
	departments: DepartmentWithHead[];
	total: number;
}> {
	try {
		logger.debug(
			{ tenantId, page, limit, type, status, parentId, search },
			"Listing departments",
		);

		// Build query filter
		const filter: Record<string, unknown> = { tenantId };

		if (type) {
			filter.type = type;
		}

		if (status) {
			filter.status = status;
		}

		if (parentId) {
			filter.parentId = parentId;
		}

		if (search) {
			filter.$or = [
				{ name: { $regex: search, $options: "i" } },
				{ code: { $regex: search, $options: "i" } },
			];
		}

		// Get total count
		const total = await Department.countDocuments(filter);

		// Get paginated results
		const skip = (page - 1) * limit;
		const departments = await Department.find(filter)
			.sort({ name: 1 })
			.skip(skip)
			.limit(limit)
			.lean();

		// Populate head details if departments have headId
		const headIds = departments
			.filter((d) => d.headId)
			.map((d) => d.headId as string);

		let headsMap: Map<
			string,
			{ _id: string; firstName: string; lastName: string }
		> = new Map();

		if (headIds.length > 0) {
			const heads = await Staff.find({
				_id: { $in: headIds },
				tenantId,
			})
				.select("_id firstName lastName")
				.lean();

			headsMap = new Map(
				heads
					.filter((h) => h._id !== null)
					.map((h) => [
						String(h._id),
						{
							_id: String(h._id),
							firstName: h.firstName,
							lastName: h.lastName,
						},
					]),
			);
		}

		// Get staff counts if requested
		let staffCountsMap: Map<string, number> = new Map();

		if (includeStaffCount) {
			const departmentIds = departments.map((d) => String(d._id));
			const staffCounts = await Staff.aggregate([
				{
					$match: {
						tenantId,
						departmentId: { $in: departmentIds },
						status: "ACTIVE",
					},
				},
				{
					$group: {
						_id: "$departmentId",
						count: { $sum: 1 },
					},
				},
			]);

			staffCountsMap = new Map(staffCounts.map((sc) => [sc._id, sc.count]));
		}

		// Combine results
		const departmentsWithDetails: DepartmentWithHead[] = departments.map(
			(d) => ({
				...(d as DepartmentLean),
				headDetails: d.headId ? headsMap.get(d.headId) || null : null,
				staffCount: includeStaffCount
					? staffCountsMap.get(String(d._id)) || 0
					: undefined,
			}),
		);

		logDatabaseOperation(
			logger,
			"find",
			"department",
			{ tenantId, page, limit },
			{ total, returned: departments.length },
		);

		return { departments: departmentsWithDetails, total };
	} catch (error) {
		logError(logger, error, "Failed to list departments");
		throw error;
	}
}

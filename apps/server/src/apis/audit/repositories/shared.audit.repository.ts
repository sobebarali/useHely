/**
 * Shared Audit Repository
 *
 * Reusable database operations for audit log queries
 */

import { AuditLog } from "@hms/db";
import { createRepositoryLogger, logDatabaseOperation } from "@/lib/logger";

const logger = createRepositoryLogger("sharedAudit");

/**
 * Shared audit log document type
 */
export type AuditLogDocument = {
	_id: string;
	tenantId: string;
	eventType: string;
	category: string;
	userId: string;
	userName: string;
	resourceType?: string | null;
	resourceId?: string | null;
	action?: string | null;
	ip?: string | null;
	userAgent?: string | null;
	sessionId?: string | null;
	details?: Record<string, unknown> | null;
	before?: Record<string, unknown> | null;
	after?: Record<string, unknown> | null;
	hash: string;
	previousHash?: string | null;
	timestamp: Date;
};

/**
 * Find audit logs by user with pagination
 */
export async function findAuditLogsByUser({
	tenantId,
	userId,
	startDate,
	endDate,
	page,
	limit,
}: {
	tenantId: string;
	userId: string;
	startDate?: Date;
	endDate?: Date;
	page: number;
	limit: number;
}): Promise<{ logs: AuditLogDocument[]; total: number }> {
	const filter: Record<string, unknown> = { tenantId, userId };

	if (startDate || endDate) {
		filter.timestamp = {};
		if (startDate) {
			(filter.timestamp as Record<string, Date>).$gte = startDate;
		}
		if (endDate) {
			(filter.timestamp as Record<string, Date>).$lte = endDate;
		}
	}

	const skip = (page - 1) * limit;

	logDatabaseOperation(logger, "find", "audit_log", { filter, skip, limit });

	const [logs, total] = await Promise.all([
		AuditLog.find(filter)
			.sort({ timestamp: -1 })
			.skip(skip)
			.limit(limit)
			.lean<AuditLogDocument[]>(),
		AuditLog.countDocuments(filter),
	]);

	return { logs, total };
}

/**
 * Find audit logs by resource with pagination
 */
export async function findAuditLogsByResource({
	tenantId,
	resourceType,
	resourceId,
	page,
	limit,
}: {
	tenantId: string;
	resourceType: string;
	resourceId: string;
	page: number;
	limit: number;
}): Promise<{ logs: AuditLogDocument[]; total: number }> {
	const filter = { tenantId, resourceType, resourceId };
	const skip = (page - 1) * limit;

	logDatabaseOperation(logger, "find", "audit_log", { filter, skip, limit });

	const [logs, total] = await Promise.all([
		AuditLog.find(filter)
			.sort({ timestamp: -1 })
			.skip(skip)
			.limit(limit)
			.lean<AuditLogDocument[]>(),
		AuditLog.countDocuments(filter),
	]);

	return { logs, total };
}

/**
 * Find audit logs in a date range for integrity verification
 */
export async function findAuditLogsForVerification({
	tenantId,
	startDate,
	endDate,
}: {
	tenantId: string;
	startDate: Date;
	endDate: Date;
}): Promise<AuditLogDocument[]> {
	const filter = {
		tenantId,
		timestamp: { $gte: startDate, $lte: endDate },
	};

	logDatabaseOperation(logger, "find", "audit_log", filter);

	const logs = await AuditLog.find(filter)
		.sort({ timestamp: 1 }) // Oldest first for chain verification
		.lean<AuditLogDocument[]>();

	return logs;
}

/**
 * Get audit statistics for a date range
 */
export async function getAuditStats({
	tenantId,
	startDate,
	endDate,
}: {
	tenantId: string;
	startDate: Date;
	endDate: Date;
}): Promise<{
	totalEvents: number;
	phiAccessEvents: number;
	uniqueUsers: number;
	uniquePatients: number;
	failedAccessAttempts: number;
	securityEvents: number;
}> {
	const baseFilter = {
		tenantId,
		timestamp: { $gte: startDate, $lte: endDate },
	};

	logDatabaseOperation(logger, "aggregate", "audit_log", baseFilter);

	const [stats] = await AuditLog.aggregate([
		{ $match: baseFilter },
		{
			$facet: {
				total: [{ $count: "count" }],
				phiAccess: [{ $match: { category: "PHI" } }, { $count: "count" }],
				uniqueUsers: [{ $group: { _id: "$userId" } }, { $count: "count" }],
				uniquePatients: [
					{ $match: { resourceType: "patient" } },
					{ $group: { _id: "$resourceId" } },
					{ $count: "count" },
				],
				failedAttempts: [
					{ $match: { eventType: "AUTH_FAILED" } },
					{ $count: "count" },
				],
				securityEvents: [
					{ $match: { category: "SECURITY" } },
					{ $count: "count" },
				],
			},
		},
	]);

	return {
		totalEvents: stats.total[0]?.count || 0,
		phiAccessEvents: stats.phiAccess[0]?.count || 0,
		uniqueUsers: stats.uniqueUsers[0]?.count || 0,
		uniquePatients: stats.uniquePatients[0]?.count || 0,
		failedAccessAttempts: stats.failedAttempts[0]?.count || 0,
		securityEvents: stats.securityEvents[0]?.count || 0,
	};
}

/**
 * Get PHI access breakdown by user
 */
export async function getPhiAccessByUser({
	tenantId,
	startDate,
	endDate,
}: {
	tenantId: string;
	startDate: Date;
	endDate: Date;
}): Promise<
	Array<{
		userId: string;
		userName: string;
		accessCount: number;
		uniquePatients: number;
	}>
> {
	const baseFilter = {
		tenantId,
		category: "PHI",
		timestamp: { $gte: startDate, $lte: endDate },
	};

	logDatabaseOperation(logger, "aggregate", "audit_log", baseFilter);

	const results = await AuditLog.aggregate([
		{ $match: baseFilter },
		{
			$group: {
				_id: "$userId",
				userName: { $first: "$userName" },
				accessCount: { $sum: 1 },
				patients: { $addToSet: "$resourceId" },
			},
		},
		{
			$project: {
				userId: "$_id",
				userName: 1,
				accessCount: 1,
				uniquePatients: { $size: "$patients" },
			},
		},
		{ $sort: { accessCount: -1 } },
		{ $limit: 50 },
	]);

	return results;
}

/**
 * Get PHI access breakdown by role
 */
export async function getPhiAccessByRole({
	tenantId,
	startDate,
	endDate,
}: {
	tenantId: string;
	startDate: Date;
	endDate: Date;
}): Promise<Record<string, number>> {
	const baseFilter = {
		tenantId,
		category: "PHI",
		timestamp: { $gte: startDate, $lte: endDate },
	};

	logDatabaseOperation(logger, "aggregate", "audit_log", baseFilter);

	const results = await AuditLog.aggregate([
		{ $match: baseFilter },
		{
			$lookup: {
				from: "staff",
				localField: "userId",
				foreignField: "userId",
				as: "staff",
			},
		},
		{ $unwind: { path: "$staff", preserveNullAndEmptyArrays: true } },
		{
			$group: {
				_id: { $ifNull: ["$staff.role", "UNKNOWN"] },
				count: { $sum: 1 },
			},
		},
	]);

	const roleAccess: Record<string, number> = {};
	for (const result of results) {
		roleAccess[result._id] = result.count;
	}

	return roleAccess;
}

/**
 * Get security incidents summary
 */
export async function getSecurityIncidents({
	tenantId,
	startDate,
	endDate,
}: {
	tenantId: string;
	startDate: Date;
	endDate: Date;
}): Promise<Array<{ type: string; count: number; uniqueUsers: number }>> {
	const baseFilter = {
		tenantId,
		category: "SECURITY",
		timestamp: { $gte: startDate, $lte: endDate },
	};

	logDatabaseOperation(logger, "aggregate", "audit_log", baseFilter);

	const results = await AuditLog.aggregate([
		{ $match: baseFilter },
		{
			$group: {
				_id: "$eventType",
				count: { $sum: 1 },
				users: { $addToSet: "$userId" },
			},
		},
		{
			$project: {
				type: "$_id",
				count: 1,
				uniqueUsers: { $size: "$users" },
			},
		},
	]);

	return results;
}

/**
 * Count estimated records for export
 */
export async function countAuditLogsForExport({
	tenantId,
	startDate,
	endDate,
	categories,
}: {
	tenantId: string;
	startDate: Date;
	endDate: Date;
	categories?: string[];
}): Promise<number> {
	const filter: Record<string, unknown> = {
		tenantId,
		timestamp: { $gte: startDate, $lte: endDate },
	};

	if (categories && categories.length > 0) {
		filter.category = { $in: categories };
	}

	logDatabaseOperation(logger, "countDocuments", "audit_log", filter);

	return AuditLog.countDocuments(filter);
}

/**
 * Fetch audit logs for export (streaming approach for large datasets)
 */
export async function fetchAuditLogsForExport({
	tenantId,
	startDate,
	endDate,
	categories,
}: {
	tenantId: string;
	startDate: Date;
	endDate: Date;
	categories?: string[];
}): Promise<AuditLogDocument[]> {
	const filter: Record<string, unknown> = {
		tenantId,
		timestamp: { $gte: startDate, $lte: endDate },
	};

	if (categories && categories.length > 0) {
		filter.category = { $in: categories };
	}

	logDatabaseOperation(logger, "find", "audit_log", { filter, limit: "all" });

	const logs = await AuditLog.find(filter)
		.sort({ timestamp: -1 })
		.lean<AuditLogDocument[]>();

	return logs;
}

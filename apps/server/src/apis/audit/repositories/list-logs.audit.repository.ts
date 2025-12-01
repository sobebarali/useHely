/**
 * List Audit Logs Repository
 *
 * Database operations for listing audit logs with filtering and pagination
 */

import { AuditLog } from "@hms/db";
import { createRepositoryLogger, logDatabaseOperation } from "@/lib/logger";
import type { ListLogsInput } from "../validations/list-logs.audit.validation";
import type { AuditLogDocument } from "./shared.audit.repository";

const logger = createRepositoryLogger("listAuditLogs");

export async function findAuditLogs({
	tenantId,
	page,
	limit,
	category,
	eventType,
	userId,
	resourceType,
	resourceId,
	startDate,
	endDate,
}: {
	tenantId: string;
	page: number;
	limit: number;
} & Omit<ListLogsInput, "page" | "limit">): Promise<{
	logs: AuditLogDocument[];
	total: number;
}> {
	// Build filter object
	const filter: Record<string, unknown> = { tenantId };

	if (category) {
		filter.category = category;
	}

	if (eventType) {
		filter.eventType = eventType;
	}

	if (userId) {
		filter.userId = userId;
	}

	if (resourceType) {
		filter.resourceType = resourceType;
	}

	if (resourceId) {
		filter.resourceId = resourceId;
	}

	// Date range filter
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

	// Execute queries in parallel
	const [logs, total] = await Promise.all([
		AuditLog.find(filter)
			.sort({ timestamp: -1 })
			.skip(skip)
			.limit(limit)
			.lean<AuditLogDocument[]>(),
		AuditLog.countDocuments(filter),
	]);

	logDatabaseOperation(logger, "find", "audit_log", undefined, {
		count: logs.length,
		total,
	});

	return { logs, total };
}

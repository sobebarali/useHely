/**
 * List Audit Logs Repository
 *
 * Database operations for listing audit logs with filtering and pagination
 */

import { AuditLog } from "@hms/db";
import { createRepositoryLogger, logDatabaseOperation } from "@/lib/logger";
import type { ListLogsInput } from "../validations/list-logs.audit.validation";

const logger = createRepositoryLogger("listAuditLogs");

interface FindAuditLogsParams extends Omit<ListLogsInput, "page" | "limit"> {
	tenantId: string;
	page: number;
	limit: number;
}

interface AuditLogDocument {
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
	timestamp: Date;
}

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
}: FindAuditLogsParams): Promise<{ logs: AuditLogDocument[]; total: number }> {
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

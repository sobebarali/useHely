/**
 * List Audit Logs Service
 *
 * Business logic for listing audit logs with filtering and pagination
 */

import { createServiceLogger, logSuccess } from "@/lib/logger";
import { AUDIT_DEFAULT_LIMIT, AUDIT_DEFAULT_PAGE } from "../audit.constants";
import { findAuditLogs } from "../repositories/list-logs.audit.repository";
import type {
	ListLogsInput,
	ListLogsOutput,
} from "../validations/list-logs.audit.validation";

const logger = createServiceLogger("listAuditLogs");

export async function listAuditLogs({
	tenantId,
	...params
}: {
	tenantId: string;
} & ListLogsInput): Promise<ListLogsOutput> {
	// Ensure page and limit are numbers (query params may be strings)
	const page = Number(params.page) || AUDIT_DEFAULT_PAGE;
	const limit = Number(params.limit) || AUDIT_DEFAULT_LIMIT;

	const { logs, total } = await findAuditLogs({
		tenantId,
		...params,
		page,
		limit,
	});

	const totalPages = Math.ceil(total / limit);

	// Transform to output format
	const transformedLogs = logs.map((log) => ({
		id: log._id,
		eventType: log.eventType,
		category: log.category,
		userId: log.userId,
		userName: log.userName,
		tenantId: log.tenantId,
		resourceType: log.resourceType,
		resourceId: log.resourceId,
		action: log.action,
		ip: log.ip,
		userAgent: log.userAgent,
		sessionId: log.sessionId,
		details: log.details,
		timestamp: log.timestamp.toISOString(),
	}));

	const result: ListLogsOutput = {
		logs: transformedLogs,
		pagination: {
			page,
			limit,
			total,
			totalPages,
		},
	};

	logSuccess(
		logger,
		{ count: transformedLogs.length, total },
		"Audit logs listed",
	);

	return result;
}

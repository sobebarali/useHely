/**
 * Resource Trail Service
 *
 * Business logic for retrieving a resource's audit trail
 */

import { createServiceLogger, logSuccess } from "@/lib/logger";
import { AUDIT_DEFAULT_LIMIT, AUDIT_DEFAULT_PAGE } from "../audit.constants";
import { findAuditLogsByResource } from "../repositories/shared.audit.repository";
import type {
	ResourceTrailOutput,
	ResourceTrailQuery,
} from "../validations/resource-trail.audit.validation";

const logger = createServiceLogger("resourceTrail");

export async function getResourceAuditTrail({
	tenantId,
	resourceType,
	resourceId,
	page: pageParam,
	limit: limitParam,
}: {
	tenantId: string;
	resourceType: string;
	resourceId: string;
} & ResourceTrailQuery): Promise<ResourceTrailOutput> {
	// Ensure page and limit are numbers (query params may be strings)
	const page = Number(pageParam) || AUDIT_DEFAULT_PAGE;
	const limit = Number(limitParam) || AUDIT_DEFAULT_LIMIT;

	const { logs, total } = await findAuditLogsByResource({
		tenantId,
		resourceType,
		resourceId,
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
		action: log.action,
		ip: log.ip,
		details: log.details,
		before: log.before,
		after: log.after,
		timestamp: log.timestamp.toISOString(),
	}));

	const result: ResourceTrailOutput = {
		resourceType,
		resourceId,
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
		{
			resourceType,
			resourceId,
			count: transformedLogs.length,
			total,
		},
		"Resource audit trail retrieved",
	);

	return result;
}

/**
 * User Trail Service
 *
 * Business logic for retrieving a user's audit trail
 */

import { createServiceLogger, logSuccess } from "@/lib/logger";
import { AUDIT_DEFAULT_LIMIT, AUDIT_DEFAULT_PAGE } from "../audit.constants";
import { findAuditLogsByUser } from "../repositories/shared.audit.repository";
import type {
	UserTrailOutput,
	UserTrailQuery,
} from "../validations/user-trail.audit.validation";

const logger = createServiceLogger("userTrail");

export async function getUserAuditTrail({
	tenantId,
	userId,
	page: pageParam,
	limit: limitParam,
	startDate,
	endDate,
}: {
	tenantId: string;
	userId: string;
} & UserTrailQuery): Promise<UserTrailOutput> {
	// Ensure page and limit are numbers (query params may be strings)
	const page = Number(pageParam) || AUDIT_DEFAULT_PAGE;
	const limit = Number(limitParam) || AUDIT_DEFAULT_LIMIT;

	const { logs, total } = await findAuditLogsByUser({
		tenantId,
		userId,
		startDate,
		endDate,
		page,
		limit,
	});

	const totalPages = Math.ceil(total / limit);

	// Transform to output format
	const transformedLogs = logs.map((log) => ({
		id: log._id,
		eventType: log.eventType,
		category: log.category,
		resourceType: log.resourceType,
		resourceId: log.resourceId,
		action: log.action,
		ip: log.ip,
		details: log.details,
		timestamp: log.timestamp.toISOString(),
	}));

	const result: UserTrailOutput = {
		userId,
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
		{ userId, count: transformedLogs.length, total },
		"User audit trail retrieved",
	);

	return result;
}

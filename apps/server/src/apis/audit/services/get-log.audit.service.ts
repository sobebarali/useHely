/**
 * Get Audit Log Service
 *
 * Business logic for retrieving a specific audit log entry
 */

import { NotFoundError } from "@/errors";
import { createServiceLogger, logSuccess } from "@/lib/logger";
import { findAuditLogById } from "../repositories/get-log.audit.repository";
import type { GetLogOutput } from "../validations/get-log.audit.validation";

const logger = createServiceLogger("getAuditLog");

interface GetLogParams {
	id: string;
	tenantId: string;
}

export async function getAuditLog(params: GetLogParams): Promise<GetLogOutput> {
	const log = await findAuditLogById(params);

	if (!log) {
		throw new NotFoundError("Audit log entry not found", "AUDIT_LOG_NOT_FOUND");
	}

	// Transform to output format
	const result: GetLogOutput = {
		log: {
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
			before: log.before,
			after: log.after,
			hash: log.hash,
			timestamp: log.timestamp.toISOString(),
		},
	};

	logSuccess(logger, { id: log._id }, "Audit log retrieved");

	return result;
}

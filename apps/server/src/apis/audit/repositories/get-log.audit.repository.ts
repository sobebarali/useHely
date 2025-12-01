/**
 * Get Audit Log Repository
 *
 * Database operations for retrieving a specific audit log entry
 */

import { AuditLog } from "@hms/db";
import { createRepositoryLogger, logDatabaseOperation } from "@/lib/logger";

const logger = createRepositoryLogger("getAuditLog");

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
	before?: Record<string, unknown> | null;
	after?: Record<string, unknown> | null;
	hash: string;
	previousHash?: string | null;
	timestamp: Date;
}

export async function findAuditLogById({
	id,
	tenantId,
}: {
	id: string;
	tenantId: string;
}): Promise<AuditLogDocument | null> {
	const filter = { _id: id, tenantId };

	logDatabaseOperation(logger, "findOne", "audit_log", filter);

	const log = await AuditLog.findOne(filter).lean<AuditLogDocument>();

	logDatabaseOperation(logger, "findOne", "audit_log", undefined, {
		found: !!log,
	});

	return log;
}

/**
 * Get Audit Log Repository
 *
 * Database operations for retrieving a specific audit log entry
 */

import { AuditLog } from "@hms/db";
import { createRepositoryLogger, logDatabaseOperation } from "@/lib/logger";
import type { AuditLogDocument } from "./shared.audit.repository";

const logger = createRepositoryLogger("getAuditLog");

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

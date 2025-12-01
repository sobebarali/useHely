/**
 * PHI Access Report Repository
 *
 * Database operations for PHI access report
 */

import { AuditLog } from "@hms/db";
import { createRepositoryLogger, logDatabaseOperation } from "@/lib/logger";

const logger = createRepositoryLogger("phiAccessReport");

interface PhiAccessDocument {
	_id: string;
	eventType: string;
	userId: string;
	userName: string;
	resourceId?: string | null;
	action?: string | null;
	ip?: string | null;
	details?: { fieldsAccessed?: string[] } | null;
	timestamp: Date;
}

export async function findPhiAccessLogs({
	tenantId,
	startDate,
	endDate,
	patientId,
	userId,
	page,
	limit,
}: {
	tenantId: string;
	startDate: Date;
	endDate: Date;
	patientId?: string;
	userId?: string;
	page: number;
	limit: number;
}): Promise<{ logs: PhiAccessDocument[]; total: number }> {
	const filter: Record<string, unknown> = {
		tenantId,
		category: "PHI",
		timestamp: { $gte: startDate, $lte: endDate },
	};

	if (patientId) {
		filter.resourceType = "patient";
		filter.resourceId = patientId;
	}

	if (userId) {
		filter.userId = userId;
	}

	const skip = (page - 1) * limit;

	logDatabaseOperation(logger, "find", "audit_log", { filter, skip, limit });

	const [logs, total] = await Promise.all([
		AuditLog.find(filter)
			.sort({ timestamp: -1 })
			.skip(skip)
			.limit(limit)
			.select(
				"_id eventType userId userName resourceId action ip details timestamp",
			)
			.lean<PhiAccessDocument[]>(),
		AuditLog.countDocuments(filter),
	]);

	return { logs, total };
}

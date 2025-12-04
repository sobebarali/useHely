/**
 * Audit Log Job Definitions
 *
 * Type definitions and helpers for audit log background jobs
 */

import type {
	AuditActionValue,
	AuditEventCategoryValue,
	AuditEventTypeValue,
} from "@hms/db";
import { auditLogQueue } from "../queues";

// Job types
export const AUDIT_JOB_TYPES = {
	EMIT_AUDIT_LOG: "emit-audit-log",
} as const;

export type AuditJobType =
	(typeof AUDIT_JOB_TYPES)[keyof typeof AUDIT_JOB_TYPES];

// Job data types
export interface EmitAuditLogJobData {
	tenantId: string;
	eventType: AuditEventTypeValue;
	category: AuditEventCategoryValue;
	userId: string;
	userName: string;
	action?: AuditActionValue;
	resourceType?: string;
	resourceId?: string;
	ip?: string;
	userAgent?: string;
	sessionId?: string;
	details?: Record<string, unknown>;
	before?: Record<string, unknown>;
	after?: Record<string, unknown>;
	// Timestamp when the event occurred (not when job was queued)
	eventTimestamp: string;
}

// Job enqueueing helper
export async function enqueueAuditLog(
	data: Omit<EmitAuditLogJobData, "eventTimestamp">,
): Promise<string> {
	const jobData: EmitAuditLogJobData = {
		...data,
		eventTimestamp: new Date().toISOString(),
	};

	const job = await auditLogQueue.add(AUDIT_JOB_TYPES.EMIT_AUDIT_LOG, jobData, {
		// No jobId - allow multiple audit logs for same event
	});
	return job.id ?? "";
}

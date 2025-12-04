/**
 * Export Job Definitions
 *
 * Type definitions and helpers for data export background jobs
 */

import type { AuditEventCategoryValue } from "@hms/db";
import { exportQueue } from "../queues";

// Job types
export const EXPORT_JOB_TYPES = {
	AUDIT_EXPORT: "audit-export",
	COMPLIANCE_EXPORT: "compliance-export",
	// PATIENT_EXPORT is intentionally not exposed - use synchronous export instead
} as const;

export type ExportJobType =
	(typeof EXPORT_JOB_TYPES)[keyof typeof EXPORT_JOB_TYPES];

// Job data types
export interface AuditExportJobData {
	exportId: string;
	tenantId: string;
	userId: string;
	startDate: string; // ISO string
	endDate: string; // ISO string
	format: "csv" | "json";
	categories?: AuditEventCategoryValue[];
}

export interface ComplianceExportJobData {
	requestId: string;
	tenantId: string;
	userId: string;
	userEmail: string;
	format: "csv" | "json";
	includeAuditLog: boolean;
}

// Job enqueueing helpers
export async function enqueueAuditExport(
	data: AuditExportJobData,
): Promise<string> {
	const job = await exportQueue.add(EXPORT_JOB_TYPES.AUDIT_EXPORT, data, {
		jobId: `audit-export-${data.exportId}`, // Dedupe by export ID
	});
	return job.id ?? "";
}

export async function enqueueComplianceExport(
	data: ComplianceExportJobData,
): Promise<string> {
	const job = await exportQueue.add(EXPORT_JOB_TYPES.COMPLIANCE_EXPORT, data, {
		jobId: `compliance-export-${data.requestId}`,
	});
	return job.id ?? "";
}

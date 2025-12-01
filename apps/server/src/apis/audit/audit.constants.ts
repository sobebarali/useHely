/**
 * Audit Log Constants
 *
 * Re-export enums from model and define additional constants
 * for the audit API endpoints
 */

// Re-export from model for convenience
export {
	AuditAction,
	type AuditActionValue,
	AuditEventCategory,
	type AuditEventCategoryValue,
	AuditEventType,
	type AuditEventTypeValue,
	AuditExportFormat,
	type AuditExportFormatValue,
	AuditExportStatus,
	type AuditExportStatusValue,
} from "@hms/db";

// Resource types for validation
export const AuditResourceType = {
	PATIENT: "patient",
	PRESCRIPTION: "prescription",
	VITALS: "vitals",
	USER: "user",
	ROLE: "role",
	DEPARTMENT: "department",
	APPOINTMENT: "appointment",
	ADMISSION: "admission",
	INVENTORY: "inventory",
	DISPENSING: "dispensing",
} as const;

export type AuditResourceTypeValue =
	(typeof AuditResourceType)[keyof typeof AuditResourceType];

// Report formats
export const ReportFormat = {
	JSON: "json",
	PDF: "pdf",
} as const;

export type ReportFormatValue =
	(typeof ReportFormat)[keyof typeof ReportFormat];

// Default pagination
export const AUDIT_DEFAULT_PAGE = 1;
export const AUDIT_DEFAULT_LIMIT = 50;
export const AUDIT_MAX_LIMIT = 100;

// Hash chain genesis value
export const HASH_CHAIN_GENESIS = "GENESIS";

/**
 * Queue Module
 *
 * Background job processing with BullMQ
 *
 * Provides:
 * - Email sending queue
 * - Data export queue (audit, compliance)
 * - Report generation queue
 * - Audit log queue
 *
 * NOTE: Patient export uses synchronous processing (returns file directly)
 */

export {
	AUDIT_JOB_TYPES,
	type AuditJobType,
	type EmitAuditLogJobData,
	enqueueAuditLog,
} from "./jobs/audit.job";

// Job types and enqueueing helpers
export {
	EMAIL_JOB_TYPES,
	type EmailJobType,
	enqueueEmail,
	enqueueHospitalVerificationEmail,
	enqueueLinkedUserEmail,
	enqueuePasswordResetEmail,
	enqueueWelcomeEmail,
	type SendEmailJobData,
	type SendHospitalVerificationEmailJobData,
	type SendLinkedUserEmailJobData,
	type SendPasswordResetEmailJobData,
	type SendWelcomeEmailJobData,
} from "./jobs/email.job";

export {
	type AuditExportJobData,
	type ComplianceExportJobData,
	EXPORT_JOB_TYPES,
	type ExportJobType,
	enqueueAuditExport,
	enqueueComplianceExport,
} from "./jobs/export.job";

export {
	enqueueReportGeneration,
	type GenerateReportJobData,
	REPORT_JOB_TYPES,
	type ReportJobType,
} from "./jobs/report.job";
// Queue definitions and instances
export {
	auditLogQueue,
	closeQueues,
	DEFAULT_JOB_OPTIONS,
	emailQueue,
	exportQueue,
	getAllQueues,
	QUEUE_NAMES,
	type QueueName,
	reportQueue,
} from "./queues";

// Worker management
export {
	getActiveWorkers,
	startWorkers,
	stopWorkers,
} from "./workers";

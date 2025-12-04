/**
 * Export Worker
 *
 * Processes data export jobs (audit, compliance exports)
 * NOTE: Patient export uses synchronous processing (returns file directly)
 */

import { AuditExportStatus } from "@hms/db";
import { type Job, Worker } from "bullmq";
import { createUtilLogger, logError, logSuccess } from "../../logger";
import { createRedisConnection } from "../../redis";
import { uploadExportFile } from "../../storage";
import {
	type AuditExportJobData,
	type ComplianceExportJobData,
	EXPORT_JOB_TYPES,
} from "../jobs/export.job";
import { QUEUE_NAMES } from "../queues";

const logger = createUtilLogger("exportWorker");

/**
 * Process audit log export
 */
async function processAuditExport(data: AuditExportJobData): Promise<void> {
	const { exportId, tenantId, startDate, endDate, format, categories } = data;

	logger.info({ exportId, tenantId, format }, "Processing audit export");

	// Import dynamically to avoid circular dependencies
	const { updateExportStatus } = await import(
		"../../../apis/audit/repositories/export.audit.repository"
	);
	const { fetchAuditLogsForExport } = await import(
		"../../../apis/audit/repositories/shared.audit.repository"
	);

	try {
		// Update status to PROCESSING
		await updateExportStatus({
			id: exportId,
			tenantId,
			status: AuditExportStatus.PROCESSING,
		});

		// Fetch audit logs
		const logs = await fetchAuditLogsForExport({
			tenantId,
			startDate: new Date(startDate),
			endDate: new Date(endDate),
			categories,
		});

		// Convert to requested format
		let exportData: string;
		if (format === "csv") {
			exportData = convertAuditLogsToCSV(logs);
		} else {
			exportData = JSON.stringify(
				{
					exportId,
					tenantId,
					startDate,
					endDate,
					categories: categories || [],
					totalRecords: logs.length,
					exportedAt: new Date().toISOString(),
					logs,
				},
				null,
				2,
			);
		}

		// Upload to R2
		const uploadResult = await uploadExportFile({
			tenantId,
			exportId,
			type: "audit",
			format,
			data: exportData,
		});

		if (!uploadResult?.downloadUrl) {
			throw new Error("Failed to upload export file to storage");
		}

		// Update status to COMPLETED
		await updateExportStatus({
			id: exportId,
			tenantId,
			status: AuditExportStatus.COMPLETED,
			downloadUrl: uploadResult.downloadUrl,
			storageKey: uploadResult.key,
			processedRecords: logs.length,
		});

		logSuccess(
			logger,
			{ exportId, processedRecords: logs.length },
			"Audit export completed",
		);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error during export";

		await updateExportStatus({
			id: exportId,
			tenantId,
			status: AuditExportStatus.FAILED,
			errorMessage,
		});

		throw error;
	}
}

/**
 * Convert audit logs to CSV format
 */
function convertAuditLogsToCSV(logs: Array<Record<string, unknown>>): string {
	if (logs.length === 0) {
		return "id,tenantId,eventType,category,userId,userName,resourceType,resourceId,action,ip,userAgent,timestamp\n";
	}

	const headers = [
		"id",
		"tenantId",
		"eventType",
		"category",
		"userId",
		"userName",
		"resourceType",
		"resourceId",
		"action",
		"ip",
		"userAgent",
		"timestamp",
	];

	const rows = logs.map((log) => {
		return [
			log._id,
			log.tenantId,
			log.eventType,
			log.category,
			log.userId,
			log.userName,
			log.resourceType || "",
			log.resourceId || "",
			log.action || "",
			log.ip || "",
			log.userAgent || "",
			log.timestamp instanceof Date
				? log.timestamp.toISOString()
				: log.timestamp,
		]
			.map((val) => `"${String(val).replace(/"/g, '""')}"`)
			.join(",");
	});

	return [headers.join(","), ...rows].join("\n");
}

/**
 * Process compliance/GDPR data export
 */
async function processComplianceExport(
	data: ComplianceExportJobData,
): Promise<void> {
	const { requestId, tenantId, userId, format, includeAuditLog } = data;

	logger.info({ requestId, tenantId, format }, "Processing compliance export");

	// Import dynamically
	const { updateExportWithDownloadUrl, markExportFailed } = await import(
		"../../../apis/compliance/repositories/request-export.compliance.repository"
	);
	const { collectUserData, convertToCSV } = await import(
		"../../../apis/compliance/services/data-collector.compliance.service"
	);
	const { EXPORT_DOWNLOAD_EXPIRY_DAYS } = await import(
		"../../../apis/compliance/compliance.constants"
	);

	try {
		const collectedData = await collectUserData({
			tenantId,
			userId,
			includeAuditLog,
		});

		// Calculate download expiry
		const downloadExpiry = new Date();
		downloadExpiry.setDate(
			downloadExpiry.getDate() + EXPORT_DOWNLOAD_EXPIRY_DAYS,
		);

		// Prepare export content based on format
		let exportContent: string;
		const formatType = format === "csv" ? "csv" : "json";

		if (format === "csv") {
			exportContent = convertToCSV(collectedData);
		} else {
			exportContent = JSON.stringify(
				{
					requestId,
					userId,
					exportedAt: new Date().toISOString(),
					data: collectedData,
				},
				null,
				2,
			);
		}

		// Upload to R2
		const uploadResult = await uploadExportFile({
			tenantId,
			exportId: requestId,
			type: "compliance",
			format: formatType,
			data: exportContent,
		});

		if (!uploadResult?.downloadUrl) {
			throw new Error("Failed to upload export file to storage");
		}

		// Update request with download URL
		await updateExportWithDownloadUrl({
			requestId,
			tenantId,
			downloadUrl: uploadResult.downloadUrl,
			storageKey: uploadResult.key,
			downloadExpiry,
		});

		logSuccess(logger, { requestId }, "Compliance export completed");
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error during export";

		await markExportFailed({
			requestId,
			tenantId,
			errorMessage,
		});

		throw error;
	}
}

/**
 * Process export jobs
 */
async function processExportJob(job: Job): Promise<void> {
	logger.debug({ jobId: job.id, type: job.name }, "Processing export job");

	switch (job.name) {
		case EXPORT_JOB_TYPES.AUDIT_EXPORT:
			await processAuditExport(job.data as AuditExportJobData);
			break;
		case EXPORT_JOB_TYPES.COMPLIANCE_EXPORT:
			await processComplianceExport(job.data as ComplianceExportJobData);
			break;
		default:
			throw new Error(`Unknown export job type: ${job.name}`);
	}
}

/**
 * Create and start the export worker
 */
export function createExportWorker(): Worker {
	const connection = createRedisConnection();

	const worker = new Worker(QUEUE_NAMES.EXPORT, processExportJob, {
		connection,
		concurrency: 2, // Limit concurrency for resource-intensive exports
	});

	worker.on("completed", (job) => {
		logger.debug({ jobId: job.id }, "Export job completed");
	});

	worker.on("failed", (job, error) => {
		logError(logger, error, "Export job failed", { jobId: job?.id });
	});

	worker.on("error", (error) => {
		logError(logger, error, "Export worker error");
	});

	logger.info("Export worker started");
	return worker;
}

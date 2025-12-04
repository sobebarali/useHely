/**
 * Export Audit Logs Service
 *
 * Business logic for creating and managing audit log exports
 * Uses Cloudflare R2 for file storage
 */

import { AuditExportStatus } from "@hms/db";
import { BadRequestError } from "@/errors";
import { createServiceLogger, logSuccess } from "@/lib/logger";
import { isR2Configured, uploadExportFile } from "@/lib/storage";
import {
	createExportJob,
	updateExportStatus,
} from "../repositories/export.audit.repository";
import {
	type AuditLogDocument,
	countAuditLogsForExport,
	fetchAuditLogsForExport,
} from "../repositories/shared.audit.repository";
import type {
	ExportInput,
	ExportOutput,
} from "../validations/export.audit.validation";

const logger = createServiceLogger("exportAudit");

/**
 * Convert audit logs to CSV format
 */
function convertToCSV(logs: AuditLogDocument[]): string {
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
			log.timestamp.toISOString(),
		]
			.map((val) => `"${String(val).replace(/"/g, '""')}"`)
			.join(",");
	});

	return [headers.join(","), ...rows].join("\n");
}

export async function initiateExport({
	tenantId,
	userId,
	startDate,
	endDate,
	format,
	categories,
}: {
	tenantId: string;
	userId: string;
} & ExportInput): Promise<ExportOutput> {
	// Check if R2 storage is configured
	if (!isR2Configured) {
		throw new BadRequestError(
			"Storage service is not configured. Please contact your administrator.",
			"STORAGE_NOT_CONFIGURED",
		);
	}

	// Estimate the number of records
	const estimatedRecords = await countAuditLogsForExport({
		tenantId,
		startDate,
		endDate,
		categories,
	});

	// Create export job record
	const exportJob = await createExportJob({
		tenantId,
		startDate,
		endDate,
		format,
		categories,
		estimatedRecords,
		requestedBy: userId,
	});

	// Process export synchronously for now
	// In production, this would be a background job for large exports
	let downloadUrl: string | null = null;
	let storageKey: string | null = null;
	let finalStatus = exportJob.status;

	try {
		// Update status to PROCESSING
		await updateExportStatus({
			id: exportJob._id,
			tenantId,
			status: AuditExportStatus.PROCESSING,
		});

		// Fetch audit logs
		const logs = await fetchAuditLogsForExport({
			tenantId,
			startDate,
			endDate,
			categories,
		});

		// Convert to requested format
		let exportData: string;
		if (format === "csv") {
			exportData = convertToCSV(logs);
		} else {
			// JSON format
			exportData = JSON.stringify(
				{
					exportId: exportJob._id,
					tenantId,
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString(),
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
			exportId: exportJob._id,
			type: "audit",
			format: format as "json" | "csv",
			data: exportData,
		});

		if (!uploadResult?.downloadUrl) {
			throw new Error("Failed to upload export file to storage");
		}

		downloadUrl = uploadResult.downloadUrl;
		storageKey = uploadResult.key;

		// Update status to COMPLETED
		await updateExportStatus({
			id: exportJob._id,
			tenantId,
			status: AuditExportStatus.COMPLETED,
			downloadUrl,
			storageKey,
			processedRecords: logs.length,
		});

		finalStatus = AuditExportStatus.COMPLETED;

		logSuccess(
			logger,
			{
				exportId: exportJob._id,
				processedRecords: logs.length,
				format,
				hasDownloadUrl: true,
			},
			"Export completed successfully",
		);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error during export";

		// Update status to FAILED
		await updateExportStatus({
			id: exportJob._id,
			tenantId,
			status: AuditExportStatus.FAILED,
			errorMessage,
		});

		finalStatus = AuditExportStatus.FAILED;

		logger.error(
			{ error, exportId: exportJob._id, errorMessage },
			"Export failed",
		);
	}

	const result: ExportOutput = {
		exportId: exportJob._id,
		status: finalStatus,
		estimatedRecords: exportJob.estimatedRecords,
		downloadUrl,
	};

	return result;
}

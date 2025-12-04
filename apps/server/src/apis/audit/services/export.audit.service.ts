/**
 * Export Audit Logs Service
 *
 * Business logic for creating and managing audit log exports
 * Uses BullMQ for background processing and Cloudflare R2 for file storage
 */

import { AuditExportStatus } from "@hms/db";
import { BadRequestError } from "@/errors";
import { createServiceLogger, logSuccess } from "@/lib/logger";
import { enqueueAuditExport } from "@/lib/queue";
import { isR2Configured } from "@/lib/storage";
import { createExportJob } from "../repositories/export.audit.repository";
import { countAuditLogsForExport } from "../repositories/shared.audit.repository";
import type {
	ExportInput,
	ExportOutput,
} from "../validations/export.audit.validation";

const logger = createServiceLogger("exportAudit");

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
	if (!isR2Configured()) {
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

	// Enqueue background job for processing
	await enqueueAuditExport({
		exportId: exportJob._id,
		tenantId,
		userId,
		startDate: startDate.toISOString(),
		endDate: endDate.toISOString(),
		format: format as "csv" | "json",
		categories,
	});

	logSuccess(
		logger,
		{
			exportId: exportJob._id,
			estimatedRecords,
			format,
		},
		"Export job queued for processing",
	);

	// Return immediately with PENDING status
	// Client should poll export-status endpoint for completion
	const result: ExportOutput = {
		exportId: exportJob._id,
		status: AuditExportStatus.PENDING,
		estimatedRecords: exportJob.estimatedRecords,
		downloadUrl: null,
	};

	return result;
}

/**
 * Export Audit Logs Service
 *
 * Business logic for creating and managing audit log exports
 */

import { createServiceLogger, logSuccess } from "@/lib/logger";
import { createExportJob } from "../repositories/export.audit.repository";
import { countAuditLogsForExport } from "../repositories/shared.audit.repository";
import type {
	ExportInput,
	ExportOutput,
} from "../validations/export.audit.validation";

const logger = createServiceLogger("exportAudit");

interface ExportParams extends ExportInput {
	tenantId: string;
	userId: string;
}

export async function initiateExport(
	params: ExportParams,
): Promise<ExportOutput> {
	const { tenantId, userId, startDate, endDate, format, categories } = params;

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

	// In a production environment, this would queue a background job
	// to process the export asynchronously
	// For now, we just create the job record and return

	const result: ExportOutput = {
		exportId: exportJob._id,
		status: exportJob.status,
		estimatedRecords: exportJob.estimatedRecords,
		downloadUrl: exportJob.downloadUrl || null,
	};

	logSuccess(
		logger,
		{
			exportId: exportJob._id,
			estimatedRecords,
			format,
		},
		"Export job created",
	);

	return result;
}

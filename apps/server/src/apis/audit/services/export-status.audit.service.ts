/**
 * Export Status Service
 *
 * Business logic for checking export job status
 */

import { NotFoundError } from "@/errors";
import { createServiceLogger, logSuccess } from "@/lib/logger";
import { findExportById } from "../repositories/export.audit.repository";
import type { ExportStatusOutput } from "../validations/export-status.audit.validation";

const logger = createServiceLogger("exportStatus");

export async function getExportStatus({
	exportId,
	tenantId,
}: {
	exportId: string;
	tenantId: string;
}): Promise<ExportStatusOutput> {
	const exportJob = await findExportById({ id: exportId, tenantId });

	if (!exportJob) {
		throw new NotFoundError("Export job not found", "EXPORT_NOT_FOUND");
	}

	const result: ExportStatusOutput = {
		exportId: exportJob._id,
		status: exportJob.status,
		format: exportJob.format,
		estimatedRecords: exportJob.estimatedRecords,
		processedRecords: exportJob.processedRecords,
		downloadUrl: exportJob.downloadUrl || null,
		errorMessage: exportJob.errorMessage || null,
		createdAt: exportJob.createdAt.toISOString(),
		completedAt: exportJob.completedAt?.toISOString() || null,
	};

	logSuccess(
		logger,
		{ exportId, status: exportJob.status },
		"Export status retrieved",
	);

	return result;
}

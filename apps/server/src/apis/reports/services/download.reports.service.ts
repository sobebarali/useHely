/**
 * Download report service
 *
 * Business logic for GET /api/reports/:reportId/download
 */

import { ReportStatus } from "@hms/db";
import { BadRequestError, GoneError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { getReportForDownload } from "../repositories/download.reports.repository";
import { isReportExpired } from "../repositories/shared.reports.repository";
import type {
	DownloadReportInput,
	DownloadReportOutput,
} from "../validations/download.reports.validation";

const logger = createServiceLogger("downloadReport");

/**
 * Download a previously generated report
 */
export async function downloadReportService({
	tenantId,
	reportId,
}: DownloadReportInput): Promise<DownloadReportOutput> {
	logger.info({ tenantId, reportId }, "Downloading report");

	const report = await getReportForDownload({ tenantId, reportId });

	if (!report) {
		throw new NotFoundError("Report not found", "REPORT_NOT_FOUND");
	}

	// Handle different report statuses
	if (report.status === ReportStatus.GENERATING) {
		throw new BadRequestError(
			"Report is still being generated. Please try again later.",
			"REPORT_GENERATING",
		);
	}

	if (report.status === ReportStatus.FAILED) {
		throw new BadRequestError(
			report.errorMessage ?? "Report generation failed",
			"REPORT_FAILED",
		);
	}

	if (report.status === ReportStatus.PENDING) {
		throw new BadRequestError(
			"Report generation has not started yet",
			"REPORT_PENDING",
		);
	}

	// Check expiration only for completed reports
	if (report.expiresAt && isReportExpired(report.expiresAt)) {
		throw new GoneError("Report has expired", "REPORT_EXPIRED");
	}

	logger.info(
		{ tenantId, reportId, reportType: report.reportType },
		"Report downloaded successfully",
	);

	return {
		reportId: report._id as string,
		reportType: report.reportType,
		format: report.format,
		data: report.data,
		generatedAt: report.generatedAt?.toISOString() ?? "",
	};
}

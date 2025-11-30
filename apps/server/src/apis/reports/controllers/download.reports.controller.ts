/**
 * Download report controller
 *
 * HTTP handler for GET /api/reports/:reportId/download
 */

import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../../../errors";
import {
	createControllerLogger,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { downloadReportService } from "../services/download.reports.service";

const logger = createControllerLogger("downloadReport");

export async function downloadReportController(req: Request, res: Response) {
	const startTime = Date.now();

	logInput(
		logger,
		{ reportId: req.params.reportId },
		"Download report request received",
	);

	const { user } = req;
	if (!user?.tenantId) {
		throw new UnauthorizedError("Authentication required");
	}

	const reportId = req.params.reportId;
	if (!reportId) {
		throw new BadRequestError("MISSING_REPORT_ID", "Report ID is required");
	}

	const result = await downloadReportService({
		tenantId: user.tenantId,
		reportId,
	});

	const duration = Date.now() - startTime;

	logSuccess(
		logger,
		{ reportId: result.reportId, reportType: result.reportType },
		"Report downloaded successfully",
		duration,
	);

	res.status(200).json(result);
}

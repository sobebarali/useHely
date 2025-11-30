/**
 * Generate report controller
 *
 * HTTP handler for POST /api/reports/generate
 */

import type { Request, Response } from "express";
import { UnauthorizedError } from "../../../errors";
import {
	createControllerLogger,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { generateReportService } from "../services/generate.reports.service";

const logger = createControllerLogger("generateReport");

export async function generateReportController(req: Request, res: Response) {
	const startTime = Date.now();

	logInput(logger, req.body, "Generate report request received");

	const { user } = req;
	if (!user?.tenantId) {
		throw new UnauthorizedError("Authentication required");
	}

	// Request body is validated and typed by the validate middleware
	const { reportType, parameters, format } = req.body as {
		reportType: string;
		parameters: Record<string, unknown>;
		format: string;
	};

	// Get staff name from user context
	const staffName = user.name ?? "Unknown";
	const staffId = user.staffId ?? user.id;

	const result = await generateReportService({
		tenantId: user.tenantId,
		staffId,
		staffName,
		reportType,
		parameters,
		format,
	});

	const duration = Date.now() - startTime;

	logSuccess(
		logger,
		{ reportId: result.reportId, reportType: result.reportType },
		"Report generated successfully",
		duration,
	);

	res.status(201).json(result);
}

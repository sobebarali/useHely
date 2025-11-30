/**
 * History reports controller
 *
 * HTTP handler for GET /api/reports/history
 */

import type { Request, Response } from "express";
import { UnauthorizedError } from "../../../errors";
import {
	createControllerLogger,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { historyReportsService } from "../services/history.reports.service";

const logger = createControllerLogger("historyReports");

export async function historyReportsController(req: Request, res: Response) {
	const startTime = Date.now();

	logInput(logger, req.query, "History reports request received");

	const { user } = req;
	if (!user?.tenantId) {
		throw new UnauthorizedError("Authentication required");
	}

	// Query params are validated and coerced by the validate middleware
	const { page, limit, reportType, startDate, endDate } =
		req.query as unknown as {
			page: number;
			limit: number;
			reportType?: string;
			startDate?: string;
			endDate?: string;
		};

	const result = await historyReportsService({
		tenantId: user.tenantId,
		page,
		limit,
		reportType,
		startDate,
		endDate,
	});

	const duration = Date.now() - startTime;

	logSuccess(
		logger,
		{
			total: result.pagination.total,
			returned: result.data.length,
		},
		"Report history fetched successfully",
		duration,
	);

	res.status(200).json(result);
}

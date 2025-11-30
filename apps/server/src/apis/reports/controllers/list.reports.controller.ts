/**
 * List reports controller
 *
 * HTTP handler for GET /api/reports
 */

import type { Request, Response } from "express";
import { UnauthorizedError } from "../../../errors";
import {
	createControllerLogger,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { listReportsService } from "../services/list.reports.service";

const logger = createControllerLogger("listReports");

export async function listReportsController(req: Request, res: Response) {
	const startTime = Date.now();

	logInput(logger, {}, "List reports request received");

	const { user } = req;
	if (!user?.tenantId) {
		throw new UnauthorizedError("Authentication required");
	}

	const result = await listReportsService({
		tenantId: user.tenantId,
	});

	const duration = Date.now() - startTime;

	logSuccess(
		logger,
		{ count: result.reports.length },
		"Reports listed successfully",
		duration,
	);

	res.status(200).json(result);
}

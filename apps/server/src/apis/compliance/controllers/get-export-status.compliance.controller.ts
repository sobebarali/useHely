/**
 * Get Export Status Controller
 *
 * Endpoint: GET /api/compliance/data-export/:requestId
 * Description: Check status of a data export request
 * Auth: Required
 */

import type { Response } from "express";
import { createControllerLogger, logSuccess } from "@/lib/logger";
import {
	type AuthenticatedRequest,
	authenticatedHandler,
} from "@/utils/async-handler";
import { getExportStatusService } from "../services/get-export-status.compliance.service";

const logger = createControllerLogger("getExportStatus");

export const getExportStatusController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		const { requestId } = req.params as { requestId: string };

		logger.debug({ requestId }, "Get export status request received");

		const result = await getExportStatusService({
			tenantId: req.user.tenantId,
			userId: req.user.id,
			requestId,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ requestId, status: result.status },
			"Export status retrieved",
			duration,
		);

		res.status(200).json({
			success: true,
			data: result,
		});
	},
);

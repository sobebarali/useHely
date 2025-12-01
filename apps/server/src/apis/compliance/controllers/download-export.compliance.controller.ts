/**
 * Download Export Controller
 *
 * Endpoint: GET /api/compliance/data-export/:requestId/download
 * Description: Download the exported data file
 * Auth: Required
 */

import type { Response } from "express";
import { createControllerLogger, logSuccess } from "@/lib/logger";
import {
	type AuthenticatedRequest,
	authenticatedHandler,
} from "@/utils/async-handler";
import { downloadExportService } from "../services/download-export.compliance.service";

const logger = createControllerLogger("downloadExport");

export const downloadExportController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		const { requestId } = req.params as { requestId: string };

		logger.debug({ requestId }, "Download export request received");

		const result = await downloadExportService({
			tenantId: req.user.tenantId,
			userId: req.user.id,
			requestId,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ requestId, format: result.format },
			"Export downloaded",
			duration,
		);

		// Set appropriate headers based on format
		if (result.format === "csv") {
			res.setHeader("Content-Type", "text/csv");
			res.setHeader(
				"Content-Disposition",
				`attachment; filename="${result.filename}"`,
			);
			res.send(result.content);
		} else {
			res.setHeader("Content-Type", "application/json");
			res.setHeader(
				"Content-Disposition",
				`attachment; filename="${result.filename}"`,
			);
			res.json(result.content);
		}
	},
);

/**
 * Export Status Controller
 *
 * Endpoint: GET /api/audit/export/:exportId
 * Description: Check export job status and get download URL when ready
 * Auth: Required (AUDIT:EXPORT permission)
 */

import type { Request, Response } from "express";
import { createControllerLogger, logError, logSuccess } from "@/lib/logger";
import { getExportStatus } from "../services/export-status.audit.service";

const logger = createControllerLogger("exportStatus");

export async function exportStatusController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.debug("Export status request received");

		// Get tenant ID from authenticated user
		const tenantId = req.user?.tenantId;
		if (!tenantId) {
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Tenant ID not found in request",
			});
		}

		const exportId = req.params.exportId;
		if (!exportId) {
			return res.status(400).json({
				code: "BAD_REQUEST",
				message: "Export ID is required",
			});
		}

		const result = await getExportStatus({ exportId, tenantId });

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				exportId,
				status: result.status,
			},
			"Export status retrieved successfully",
			duration,
		);

		res.status(200).json({
			success: true,
			data: result,
		});
	} catch (error: unknown) {
		const duration = Date.now() - startTime;

		// Handle known business errors
		if (
			error &&
			typeof error === "object" &&
			"status" in error &&
			"code" in error
		) {
			const err = error as { status: number; code: string; message: string };

			logger.warn(
				{
					errorCode: err.code,
					errorMessage: err.message,
					duration,
				},
				"Export status request failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error getting export status", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

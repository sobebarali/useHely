/**
 * Export Audit Logs Controller
 *
 * Endpoint: POST /api/audit/export
 * Description: Export audit logs for archival or external analysis
 * Auth: Required (AUDIT:EXPORT permission)
 */

import type { Request, Response } from "express";
import { createControllerLogger, logError, logSuccess } from "@/lib/logger";
import { initiateExport } from "../services/export.audit.service";
import type { ExportInput } from "../validations/export.audit.validation";

const logger = createControllerLogger("exportAudit");

export async function exportController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.debug("Export audit logs request received");

		// Get tenant ID and user ID from authenticated user
		const tenantId = req.user?.tenantId;
		const userId = req.user?.id;
		if (!tenantId || !userId) {
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Authentication required",
			});
		}

		const body = req.body as ExportInput;

		const result = await initiateExport({
			tenantId,
			userId,
			...body,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				exportId: result.exportId,
				estimatedRecords: result.estimatedRecords,
			},
			"Export job initiated successfully",
			duration,
		);

		// Return 202 Accepted as export is processed asynchronously
		res.status(202).json({
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
				"Export initiation failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error initiating export", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

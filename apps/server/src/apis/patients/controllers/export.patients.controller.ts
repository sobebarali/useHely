import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { exportPatientsService } from "../services/export.patients.service";
import type { ExportPatientsInput } from "../validations/export.patients.validation";

const logger = createControllerLogger("exportPatients");

export async function exportPatientsController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logInput(logger, req.query, "Export patients request received");

		// User should be set by authenticate middleware
		if (!req.user?.id || !req.user.tenantId) {
			logger.warn("No user or tenant found in request");
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Authentication required",
			});
		}

		const query = req.query as unknown as ExportPatientsInput;

		const result = await exportPatientsService({
			tenantId: req.user.tenantId,
			...query,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				format: query.format,
				filename: result.filename,
			},
			"Patients exported successfully",
			duration,
		);

		// Set headers for file download
		res.setHeader("Content-Type", result.contentType);
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="${result.filename}"`,
		);

		res.status(200).send(result.content);
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
				"Export patients failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error exporting patients", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

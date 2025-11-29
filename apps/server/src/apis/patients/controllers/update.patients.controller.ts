import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { updatePatientService } from "../services/update.patients.service";

const logger = createControllerLogger("updatePatient");

export async function updatePatientController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		// Redact photo from logs
		const logBody = { ...req.body };
		if (logBody.photo) {
			logBody.photo = "[REDACTED]";
		}
		logInput(
			logger,
			{ id: req.params.id, ...logBody },
			"Update patient request received",
		);

		// User should be set by authenticate middleware
		if (!req.user?.id || !req.user.tenantId) {
			logger.warn("No user or tenant found in request");
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Authentication required",
			});
		}

		const patientId = req.params.id;

		if (!patientId) {
			return res.status(400).json({
				code: "INVALID_REQUEST",
				message: "Patient ID is required",
			});
		}

		const result = await updatePatientService({
			tenantId: req.user.tenantId,
			patientId,
			...req.body,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				patientId: result.patientId,
			},
			"Patient updated successfully",
			duration,
		);

		res.status(200).json(result);
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
				"Update patient failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error updating patient", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

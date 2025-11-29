import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { registerPatientService } from "../services/register.patients.service";

const logger = createControllerLogger("registerPatient");

export async function registerPatientController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		// Redact photo from logs
		const logBody = { ...req.body };
		if (logBody.photo) {
			logBody.photo = "[REDACTED]";
		}
		logInput(logger, logBody, "Register patient request received");

		// User should be set by authenticate middleware
		if (!req.user?.id || !req.user.tenantId) {
			logger.warn("No user or tenant found in request");
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Authentication required",
			});
		}

		const result = await registerPatientService({
			tenantId: req.user.tenantId,
			...req.body,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				patientId: result.patientId,
				id: result.id,
			},
			"Patient registered successfully",
			duration,
		);

		res.status(201).json(result);
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
				"Register patient failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Handle mongoose duplicate key errors
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === 11000
		) {
			logger.warn({ duration }, "Duplicate key error");

			return res.status(409).json({
				code: "DUPLICATE_ENTRY",
				message: "A patient with this information already exists",
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error registering patient", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

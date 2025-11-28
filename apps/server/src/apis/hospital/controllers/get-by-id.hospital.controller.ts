import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logSuccess,
} from "../../../lib/logger";
import { getHospitalById } from "../services/get-by-id.hospital.service";

const logger = createControllerLogger("getHospitalById");

export async function getHospitalByIdController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		const { id } = req.params;

		// Validation middleware should ensure id is present
		if (!id) {
			return res.status(400).json({
				error: "Hospital ID is required",
				code: "INVALID_INPUT",
			});
		}

		logger.info({ hospitalId: id }, "Get hospital by ID controller started");

		const hospital = await getHospitalById({ id });

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				hospitalId: hospital.id,
				status: hospital.status,
			},
			"Hospital retrieved successfully",
			duration,
		);

		res.status(200).json(hospital);
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
				"Business validation failed",
			);

			return res.status(err.status).json({
				error: err.message,
				code: err.code,
			});
		}

		// Log unexpected errors with full context
		logError(logger, error, "Unexpected error retrieving hospital", {
			hospitalId: req.params.id,
			duration,
		});

		// Return generic error
		res.status(500).json({
			error: "An unexpected error occurred while retrieving the hospital",
			code: "INTERNAL_ERROR",
		});
	}
}

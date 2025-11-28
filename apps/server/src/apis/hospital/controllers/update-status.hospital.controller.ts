import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { updateStatusHospital } from "../services/update-status.hospital.service";

const logger = createControllerLogger("updateStatusHospital");

export async function updateStatusHospitalController(
	req: Request,
	res: Response,
) {
	const startTime = Date.now();

	try {
		const { id } = req.params;

		// Log controller entry with input payload
		logInput(
			logger,
			{ hospitalId: id, statusUpdate: req.body },
			"Update hospital status controller started",
		);

		const hospital = await updateStatusHospital({
			id: id || "",
			data: req.body,
		});

		const duration = Date.now() - startTime;

		// Log success with updated hospital ID and duration
		logSuccess(
			logger,
			{
				hospitalId: hospital.id,
				newStatus: hospital.status,
			},
			"Hospital status updated successfully",
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

			// Log business error
			logger.warn(
				{
					errorCode: err.code,
					errorMessage: err.message,
					duration,
				},
				"Business validation failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Handle mongoose cast errors (invalid ObjectId)
		if (
			error &&
			typeof error === "object" &&
			"name" in error &&
			error.name === "CastError"
		) {
			logger.warn(
				{
					errorCode: "INVALID_ID",
					duration,
				},
				"Invalid hospital ID format",
			);

			return res.status(400).json({
				code: "INVALID_ID",
				message: "Invalid hospital ID format",
			});
		}

		// Log unexpected errors with full context
		logError(logger, error, "Unexpected error updating hospital status", {
			hospitalId: req.params.id,
			input: req.body,
			duration,
		});

		// Return generic error
		res.status(500).json({
			code: "INTERNAL_ERROR",
			message:
				"An unexpected error occurred while updating the hospital status",
		});
	}
}

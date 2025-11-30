import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logSuccess,
} from "../../../lib/logger";
import { getKeyStatus } from "../services/get-key-status.security.service";

const logger = createControllerLogger("getKeyStatus");

export async function getKeyStatusController(_req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.debug("Get key status request received");

		const result = await getKeyStatus();

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				currentKeyId: result.currentKeyId,
				rotationRecommended: result.rotationRecommended,
			},
			"Key status retrieved successfully",
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
				"Get key status failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error retrieving key status", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

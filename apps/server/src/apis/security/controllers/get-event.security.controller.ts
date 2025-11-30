import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logSuccess,
} from "../../../lib/logger";
import { getEvent } from "../services/get-event.security.service";
import type { GetEventInput } from "../validations/get-event.security.validation";

const logger = createControllerLogger("getSecurityEvent");

export async function getEventController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.debug("Get security event request received");

		// ID comes from validated params
		const { id } = req.params as GetEventInput;

		const result = await getEvent({ id });

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				eventId: id,
				type: result.type,
				severity: result.severity,
			},
			"Security event retrieved successfully",
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
					eventId: req.params.id,
					errorCode: err.code,
					errorMessage: err.message,
					duration,
				},
				"Get security event failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error retrieving security event", {
			eventId: req.params.id,
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

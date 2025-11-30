import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logSuccess,
} from "../../../lib/logger";
import { disableMfa } from "../services/disable-mfa.auth.service";

const logger = createControllerLogger("disableMfa");

export async function disableMfaController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.debug("Disable MFA request received");

		// User should be set by authenticate middleware
		if (!req.user?.id) {
			logger.warn("No user found in request");
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Authentication required",
			});
		}

		const result = await disableMfa({
			userId: req.user.id,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ userId: req.user.id },
			"MFA disabled successfully",
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
					userId: req.user?.id,
					errorCode: err.code,
					errorMessage: err.message,
					duration,
				},
				"Disable MFA failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error disabling MFA", {
			userId: req.user?.id,
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

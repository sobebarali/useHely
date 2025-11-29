import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logSuccess,
} from "../../../lib/logger";
import { revokeTokenService } from "../services/revoke.auth.service";
import type { RevokeTokenInput } from "../validations/revoke.auth.validation";

const logger = createControllerLogger("revokeAuth");

export async function revokeController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.info(
			{ token_type_hint: req.body.token_type_hint },
			"Token revocation request received",
		);

		const data = req.body as RevokeTokenInput;
		const userId = req.user?.id;

		const result = await revokeTokenService({
			data,
			userId,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ revoked: result.revoked },
			"Token revoked successfully",
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
				"Token revocation failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error during token revocation", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

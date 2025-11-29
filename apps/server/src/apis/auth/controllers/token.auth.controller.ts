import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logSuccess,
} from "../../../lib/logger";
import { generateTokens } from "../services/token.auth.service";
import type { TokenInput } from "../validations/token.auth.validation";

const logger = createControllerLogger("tokenAuth");

export async function tokenController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.info({ grant_type: req.body.grant_type }, "Token request received");

		const data = req.body as TokenInput;
		const ipAddress = req.ip || req.socket.remoteAddress;
		const userAgent = req.headers["user-agent"];

		const result = await generateTokens({
			data,
			ipAddress,
			userAgent,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				grant_type: data.grant_type,
				token_type: result.token_type,
				expires_in: result.expires_in,
			},
			"Token generated successfully",
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
				"Token request failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error during token generation", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

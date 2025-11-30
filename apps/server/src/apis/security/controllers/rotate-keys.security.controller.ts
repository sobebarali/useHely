import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logSuccess,
} from "../../../lib/logger";
import { rotateKeys } from "../services/rotate-keys.security.service";

const logger = createControllerLogger("rotateKeys");

export async function rotateKeysController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.debug("Rotate keys request received");

		// User should be set by authenticate middleware
		if (!req.user?.id) {
			logger.warn("No user found in request");
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Authentication required",
			});
		}

		const result = await rotateKeys({
			userId: req.user.id,
			tenantId: req.user.tenantId,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				userId: req.user.id,
				newKeyId: result.newKeyId,
				recordsReEncrypted: result.recordsReEncrypted,
			},
			"Keys rotated successfully",
			duration,
		);

		// Return 200 with warning about manual steps required
		res.status(200).json({
			success: true,
			data: result,
			warning:
				"IMPORTANT: You must update ENCRYPTION_MASTER_KEY in your .env file with the newKeyId and restart the server for the changes to take full effect.",
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

			logger.error(
				{
					userId: req.user?.id,
					errorCode: err.code,
					errorMessage: err.message,
					duration,
				},
				"Rotate keys failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error rotating keys", {
			userId: req.user?.id,
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

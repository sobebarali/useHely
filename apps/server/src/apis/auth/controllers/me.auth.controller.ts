import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logSuccess,
} from "../../../lib/logger";
import { getCurrentUser } from "../services/me.auth.service";

const logger = createControllerLogger("meAuth");

export async function meController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.debug("Get current user request received");

		// User should be set by authenticate middleware
		if (!req.user?.id) {
			logger.warn("No user found in request");
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Authentication required",
			});
		}

		const result = await getCurrentUser({
			userId: req.user.id,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				userId: result.id,
				tenantId: result.tenantId,
				rolesCount: result.roles.length,
			},
			"Current user retrieved successfully",
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
				"Get current user failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error getting current user", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

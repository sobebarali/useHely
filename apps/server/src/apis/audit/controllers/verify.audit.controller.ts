/**
 * Verify Integrity Controller
 *
 * Endpoint: POST /api/audit/verify
 * Description: Verify integrity of audit log chain for a date range
 * Auth: Required (AUDIT:MANAGE permission)
 */

import type { Request, Response } from "express";
import { createControllerLogger, logError, logSuccess } from "@/lib/logger";
import { verifyIntegrity } from "../services/verify.audit.service";
import type { VerifyInput } from "../validations/verify.audit.validation";

const logger = createControllerLogger("verifyIntegrity");

export async function verifyController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.debug("Verify integrity request received");

		// Get tenant ID from authenticated user
		const tenantId = req.user?.tenantId;
		if (!tenantId) {
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Tenant ID not found in request",
			});
		}

		const body = req.body as VerifyInput;

		const result = await verifyIntegrity({
			tenantId,
			...body,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				entriesChecked: result.entriesChecked,
				chainIntact: result.chainIntact,
			},
			"Integrity verification completed",
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
				"Integrity verification failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error during integrity verification", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

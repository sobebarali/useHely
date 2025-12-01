/**
 * User Trail Controller
 *
 * Endpoint: GET /api/audit/users/:userId/trail
 * Description: Get complete audit trail for a specific user
 * Auth: Required (AUDIT:READ permission)
 */

import type { Request, Response } from "express";
import { createControllerLogger, logError, logSuccess } from "@/lib/logger";
import { getUserAuditTrail } from "../services/user-trail.audit.service";
import type { UserTrailQuery } from "../validations/user-trail.audit.validation";

const logger = createControllerLogger("userTrail");

export async function userTrailController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.debug("User trail request received");

		// Get tenant ID from authenticated user
		const tenantId = req.user?.tenantId;
		if (!tenantId) {
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Tenant ID not found in request",
			});
		}

		const userId = req.params.userId;
		if (!userId) {
			return res.status(400).json({
				code: "BAD_REQUEST",
				message: "User ID is required",
			});
		}

		const query = req.query as unknown as UserTrailQuery;

		const result = await getUserAuditTrail({
			tenantId,
			userId,
			...query,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				userId,
				total: result.pagination.total,
				page: result.pagination.page,
			},
			"User trail retrieved successfully",
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
				"User trail request failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error getting user trail", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

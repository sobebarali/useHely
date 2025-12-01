/**
 * Get Audit Log Controller
 *
 * Endpoint: GET /api/audit/logs/:id
 * Description: Get a specific audit log entry with full details
 * Auth: Required (AUDIT:READ permission)
 */

import type { Request, Response } from "express";
import { createControllerLogger, logError, logSuccess } from "@/lib/logger";
import { getAuditLog } from "../services/get-log.audit.service";

const logger = createControllerLogger("getAuditLog");

export async function getLogController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.debug("Get audit log request received");

		// Get tenant ID from authenticated user
		const tenantId = req.user?.tenantId;
		if (!tenantId) {
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Tenant ID not found in request",
			});
		}

		const id = req.params.id;
		if (!id) {
			return res.status(400).json({
				code: "BAD_REQUEST",
				message: "Audit log ID is required",
			});
		}

		const result = await getAuditLog({ id, tenantId });

		const duration = Date.now() - startTime;

		logSuccess(logger, { id }, "Audit log retrieved successfully", duration);

		res.status(200).json({
			success: true,
			data: result.log,
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
				"Get audit log failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error getting audit log", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

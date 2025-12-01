/**
 * List Audit Logs Controller
 *
 * Endpoint: GET /api/audit/logs
 * Description: List audit logs with filtering and pagination
 * Auth: Required (AUDIT:READ permission)
 */

import type { Request, Response } from "express";
import { createControllerLogger, logError, logSuccess } from "@/lib/logger";
import { listAuditLogs } from "../services/list-logs.audit.service";
import type { ListLogsInput } from "../validations/list-logs.audit.validation";

const logger = createControllerLogger("listAuditLogs");

export async function listLogsController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.debug("List audit logs request received");

		// Get tenant ID from authenticated user
		const tenantId = req.user?.tenantId;
		if (!tenantId) {
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Tenant ID not found in request",
			});
		}

		// Filters come from validated query params
		const filters = req.query as unknown as ListLogsInput;

		const result = await listAuditLogs({
			tenantId,
			...filters,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				total: result.pagination.total,
				page: result.pagination.page,
				totalPages: result.pagination.totalPages,
			},
			"Audit logs listed successfully",
			duration,
		);

		res.status(200).json({
			success: true,
			data: result.logs,
			pagination: result.pagination,
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
				"List audit logs failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error listing audit logs", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

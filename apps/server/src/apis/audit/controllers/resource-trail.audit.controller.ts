/**
 * Resource Trail Controller
 *
 * Endpoint: GET /api/audit/resources/:resourceType/:resourceId/trail
 * Description: Get complete audit trail for a specific resource
 * Auth: Required (AUDIT:READ permission)
 */

import type { Request, Response } from "express";
import { createControllerLogger, logError, logSuccess } from "@/lib/logger";
import { getResourceAuditTrail } from "../services/resource-trail.audit.service";
import type { ResourceTrailQuery } from "../validations/resource-trail.audit.validation";

const logger = createControllerLogger("resourceTrail");

export async function resourceTrailController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.debug("Resource trail request received");

		// Get tenant ID from authenticated user
		const tenantId = req.user?.tenantId;
		if (!tenantId) {
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Tenant ID not found in request",
			});
		}

		const { resourceType, resourceId } = req.params;
		if (!resourceType || !resourceId) {
			return res.status(400).json({
				code: "BAD_REQUEST",
				message: "Resource type and ID are required",
			});
		}

		const query = req.query as unknown as ResourceTrailQuery;

		const result = await getResourceAuditTrail({
			tenantId,
			resourceType,
			resourceId,
			...query,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				resourceType,
				resourceId,
				total: result.pagination.total,
				page: result.pagination.page,
			},
			"Resource trail retrieved successfully",
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
				"Resource trail request failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error getting resource trail", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

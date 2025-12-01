/**
 * PHI Access Report Controller
 *
 * Endpoint: GET /api/audit/reports/phi-access
 * Description: Generate detailed PHI access report
 * Auth: Required (AUDIT:REPORT permission)
 */

import type { Request, Response } from "express";
import { createControllerLogger, logError, logSuccess } from "@/lib/logger";
import { generatePhiAccessReport } from "../services/phi-access-report.audit.service";
import type { PhiAccessReportInput } from "../validations/phi-access-report.audit.validation";

const logger = createControllerLogger("phiAccessReport");

export async function phiAccessReportController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.debug("PHI access report request received");

		// Get tenant ID from authenticated user
		const tenantId = req.user?.tenantId;
		if (!tenantId) {
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Tenant ID not found in request",
			});
		}

		const query = req.query as unknown as PhiAccessReportInput;

		const result = await generatePhiAccessReport({
			tenantId,
			...query,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				total: result.pagination.total,
				page: result.pagination.page,
			},
			"PHI access report generated successfully",
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
				"PHI access report generation failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error generating PHI access report", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

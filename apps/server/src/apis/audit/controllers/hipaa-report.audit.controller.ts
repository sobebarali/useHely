/**
 * HIPAA Report Controller
 *
 * Endpoint: GET /api/audit/reports/hipaa
 * Description: Generate HIPAA compliance report for a date range
 * Auth: Required (AUDIT:REPORT permission)
 */

import type { Request, Response } from "express";
import { createControllerLogger, logError, logSuccess } from "@/lib/logger";
import { generateHipaaReport } from "../services/hipaa-report.audit.service";
import type { HipaaReportInput } from "../validations/hipaa-report.audit.validation";

const logger = createControllerLogger("hipaaReport");

export async function hipaaReportController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.debug("HIPAA report request received");

		// Get tenant ID from authenticated user
		const tenantId = req.user?.tenantId;
		if (!tenantId) {
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Tenant ID not found in request",
			});
		}

		const query = req.query as unknown as HipaaReportInput;

		const result = await generateHipaaReport({
			tenantId,
			...query,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				reportId: result.reportId,
				totalEvents: result.summary.totalEvents,
			},
			"HIPAA report generated successfully",
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
				"HIPAA report generation failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error generating HIPAA report", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}

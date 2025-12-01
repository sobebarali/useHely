/**
 * Request Export Controller
 *
 * Endpoint: POST /api/compliance/data-export
 * Description: Request export of all personal data
 * Auth: Required
 */

import type { Response } from "express";
import { createControllerLogger, logInput, logSuccess } from "@/lib/logger";
import {
	type AuthenticatedRequest,
	authenticatedHandler,
} from "@/utils/async-handler";
import { requestExportService } from "../services/request-export.compliance.service";
import type { RequestExportInput } from "../validations/request-export.compliance.validation";

const logger = createControllerLogger("requestExport");

export const requestExportController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.body, "Request data export received");

		const body = req.body as RequestExportInput;

		const result = await requestExportService({
			tenantId: req.user.tenantId,
			userId: req.user.id,
			userEmail: req.user.email,
			format: body.format,
			includeAuditLog: body.includeAuditLog,
			ipAddress: req.ip || undefined,
			userAgent: req.get("user-agent"),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ requestId: result.requestId },
			"Data export request created",
			duration,
		);

		res.status(202).json({
			success: true,
			data: result,
		});
	},
);

/**
 * Process Request Controller
 *
 * Endpoint: PUT /api/compliance/requests/:requestId/process
 * Description: Manually process or expedite a data request
 * Auth: Required with COMPLIANCE:MANAGE permission
 */

import type { Response } from "express";
import { createControllerLogger, logInput, logSuccess } from "@/lib/logger";
import {
	type AuthenticatedRequest,
	authenticatedHandler,
} from "@/utils/async-handler";
import { processRequestService } from "../services/process-request.compliance.service";
import type { ProcessRequestInput } from "../validations/process-request.compliance.validation";

const logger = createControllerLogger("processRequest");

export const processRequestController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(
			logger,
			{ requestId: req.params.requestId, action: req.body.action },
			"Process data subject request received",
		);

		const { requestId } = req.params as ProcessRequestInput["params"];
		const { action, notes } = req.body as ProcessRequestInput["body"];

		const result = await processRequestService({
			tenantId: req.user.tenantId,
			adminId: req.user.id,
			requestId,
			action,
			notes,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ requestId: result.requestId, action },
			"Data subject request processed",
			duration,
		);

		res.status(200).json({
			success: true,
			data: result,
		});
	},
);

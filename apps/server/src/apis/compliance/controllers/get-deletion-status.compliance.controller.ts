/**
 * Get Deletion Status Controller
 *
 * Endpoint: GET /api/compliance/data-deletion/:requestId
 * Description: Check status of a deletion request
 * Auth: Required
 */

import type { Response } from "express";
import { createControllerLogger, logInput, logSuccess } from "@/lib/logger";
import {
	type AuthenticatedRequest,
	authenticatedHandler,
} from "@/utils/async-handler";
import { getDeletionStatusService } from "../services/get-deletion-status.compliance.service";
import type { GetDeletionStatusInput } from "../validations/get-deletion-status.compliance.validation";

const logger = createControllerLogger("getDeletionStatus");

export const getDeletionStatusController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(
			logger,
			{ requestId: req.params.requestId },
			"Get deletion status request received",
		);

		const { requestId } = req.params as GetDeletionStatusInput["params"];

		const result = await getDeletionStatusService({
			tenantId: req.user.tenantId,
			userId: req.user.id,
			requestId,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ requestId: result.requestId },
			"Deletion status retrieved",
			duration,
		);

		res.status(200).json({
			success: true,
			data: result,
		});
	},
);

/**
 * Cancel Deletion Controller
 *
 * Endpoint: POST /api/compliance/data-deletion/:requestId/cancel
 * Description: Cancel a pending deletion request during grace period
 * Auth: Required
 */

import type { Response } from "express";
import { createControllerLogger, logInput, logSuccess } from "@/lib/logger";
import {
	type AuthenticatedRequest,
	authenticatedHandler,
} from "@/utils/async-handler";
import { cancelDeletionService } from "../services/cancel-deletion.compliance.service";
import type { CancelDeletionInput } from "../validations/cancel-deletion.compliance.validation";

const logger = createControllerLogger("cancelDeletion");

export const cancelDeletionController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(
			logger,
			{ requestId: req.params.requestId },
			"Cancel deletion request received",
		);

		const { requestId } = req.params as CancelDeletionInput["params"];

		const result = await cancelDeletionService({
			tenantId: req.user.tenantId,
			userId: req.user.id,
			requestId,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ requestId: result.requestId },
			"Deletion request cancelled",
			duration,
		);

		res.status(200).json({
			success: true,
			data: result,
		});
	},
);

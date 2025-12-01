/**
 * Verify Deletion Controller
 *
 * Endpoint: POST /api/compliance/data-deletion/:requestId/verify
 * Description: Verify deletion request via token from email
 * Auth: Required
 */

import type { Response } from "express";
import { createControllerLogger, logInput, logSuccess } from "@/lib/logger";
import {
	type AuthenticatedRequest,
	authenticatedHandler,
} from "@/utils/async-handler";
import { verifyDeletionService } from "../services/verify-deletion.compliance.service";
import type { VerifyDeletionInput } from "../validations/verify-deletion.compliance.validation";

const logger = createControllerLogger("verifyDeletion");

export const verifyDeletionController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(
			logger,
			{ requestId: req.params.requestId },
			"Verify deletion request received",
		);

		const { requestId } = req.params as VerifyDeletionInput["params"];
		const { token } = req.body as VerifyDeletionInput["body"];

		const result = await verifyDeletionService({
			tenantId: req.user.tenantId,
			userId: req.user.id,
			requestId,
			token,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ requestId: result.requestId },
			"Deletion request verified",
			duration,
		);

		res.status(200).json({
			success: true,
			data: result,
		});
	},
);

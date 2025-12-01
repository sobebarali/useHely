/**
 * Request Deletion Controller
 *
 * Endpoint: POST /api/compliance/data-deletion
 * Description: Request deletion of all personal data
 * Auth: Required
 */

import type { Response } from "express";
import { createControllerLogger, logInput, logSuccess } from "@/lib/logger";
import {
	type AuthenticatedRequest,
	authenticatedHandler,
} from "@/utils/async-handler";
import { requestDeletionService } from "../services/request-deletion.compliance.service";
import type { RequestDeletionInput } from "../validations/request-deletion.compliance.validation";

const logger = createControllerLogger("requestDeletion");

export const requestDeletionController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.body, "Request data deletion received");

		const body = req.body as RequestDeletionInput;

		const result = await requestDeletionService({
			tenantId: req.user.tenantId,
			userId: req.user.id,
			userEmail: req.user.email,
			reason: body.reason,
			confirmEmail: body.confirmEmail,
			ipAddress: req.ip || undefined,
			userAgent: req.get("user-agent"),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ requestId: result.requestId },
			"Data deletion request created",
			duration,
		);

		res.status(202).json({
			success: true,
			data: result,
		});
	},
);

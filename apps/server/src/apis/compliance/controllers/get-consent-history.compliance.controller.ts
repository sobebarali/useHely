/**
 * Get Consent History Controller
 *
 * Endpoint: GET /api/compliance/consent/:purpose/history
 * Description: Get history of consent changes for a specific purpose
 * Auth: Required
 */

import type { Response } from "express";
import { createControllerLogger, logSuccess } from "@/lib/logger";
import {
	type AuthenticatedRequest,
	authenticatedHandler,
} from "@/utils/async-handler";
import { getConsentHistoryService } from "../services/get-consent-history.compliance.service";

const logger = createControllerLogger("getConsentHistory");

export const getConsentHistoryController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		const { purpose } = req.params as { purpose: string };

		logger.debug({ purpose }, "Get consent history request received");

		const result = await getConsentHistoryService({
			tenantId: req.user.tenantId,
			userId: req.user.id,
			purpose,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ purpose, count: result.history.length },
			"Consent history retrieved successfully",
			duration,
		);

		res.status(200).json({
			success: true,
			data: result,
		});
	},
);

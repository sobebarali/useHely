/**
 * List Consent Controller
 *
 * Endpoint: GET /api/compliance/consent
 * Description: Get all consent records for the authenticated user
 * Auth: Required
 */

import type { Response } from "express";
import { createControllerLogger, logSuccess } from "@/lib/logger";
import {
	type AuthenticatedRequest,
	authenticatedHandler,
} from "@/utils/async-handler";
import { listConsentService } from "../services/list-consent.compliance.service";

const logger = createControllerLogger("listConsent");

export const listConsentController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logger.debug("List consent request received");

		const result = await listConsentService({
			tenantId: req.user.tenantId,
			userId: req.user.id,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ count: result.consents.length },
			"Consent records listed successfully",
			duration,
		);

		res.status(200).json({
			success: true,
			data: result.consents,
		});
	},
);

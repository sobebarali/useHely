/**
 * Withdraw Consent Controller
 *
 * Endpoint: PUT /api/compliance/consent/:id/withdraw
 * Description: Withdraw previously granted consent
 * Auth: Required
 */

import type { Response } from "express";
import { createControllerLogger, logSuccess } from "@/lib/logger";
import {
	type AuthenticatedRequest,
	authenticatedHandler,
} from "@/utils/async-handler";
import { withdrawConsentService } from "../services/withdraw-consent.compliance.service";

const logger = createControllerLogger("withdrawConsent");

export const withdrawConsentController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		const { id } = req.params as { id: string };

		logger.debug({ consentId: id }, "Withdraw consent request received");

		const result = await withdrawConsentService({
			tenantId: req.user.tenantId,
			userId: req.user.id,
			consentId: id,
			ipAddress: req.ip || undefined,
			userAgent: req.get("user-agent"),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ consentId: result.id, purpose: result.purpose },
			"Consent withdrawn successfully",
			duration,
		);

		res.status(200).json({
			success: true,
			data: result,
		});
	},
);

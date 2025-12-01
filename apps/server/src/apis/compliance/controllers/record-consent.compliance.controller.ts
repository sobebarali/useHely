/**
 * Record Consent Controller
 *
 * Endpoint: POST /api/compliance/consent
 * Description: Record a new consent or update existing consent
 * Auth: Required
 */

import type { Response } from "express";
import { createControllerLogger, logInput, logSuccess } from "@/lib/logger";
import {
	type AuthenticatedRequest,
	authenticatedHandler,
} from "@/utils/async-handler";
import { recordConsentService } from "../services/record-consent.compliance.service";
import type { RecordConsentInput } from "../validations/record-consent.compliance.validation";

const logger = createControllerLogger("recordConsent");

export const recordConsentController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.body, "Record consent request received");

		const body = req.body as RecordConsentInput;

		const { consent, isNew } = await recordConsentService({
			tenantId: req.user.tenantId,
			userId: req.user.id,
			purpose: body.purpose,
			granted: body.granted,
			source: body.source,
			ipAddress: req.ip,
			userAgent: req.get("user-agent"),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ consentId: consent.id, purpose: consent.purpose },
			"Consent recorded successfully",
			duration,
		);

		res.status(isNew ? 201 : 200).json({
			success: true,
			data: consent,
		});
	},
);

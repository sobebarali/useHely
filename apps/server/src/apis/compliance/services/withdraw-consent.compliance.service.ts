/**
 * Withdraw Consent Service
 *
 * Business logic for withdrawing consent
 */

import { BadRequestError, NotFoundError } from "@/errors";
import { createServiceLogger, logSuccess } from "@/lib/logger";
import {
	ComplianceErrorCodes,
	ComplianceMessages,
} from "../compliance.constants";
import { findConsentById } from "../repositories/shared.compliance.repository";
import { withdrawConsent } from "../repositories/withdraw-consent.compliance.repository";
import type { WithdrawConsentOutput } from "../validations/withdraw-consent.compliance.validation";

const logger = createServiceLogger("withdrawConsent");

export async function withdrawConsentService({
	tenantId,
	userId,
	consentId,
	ipAddress,
	userAgent,
}: {
	tenantId: string;
	userId: string;
	consentId: string;
	ipAddress?: string;
	userAgent?: string;
}): Promise<WithdrawConsentOutput> {
	logger.info({ tenantId, userId, consentId }, "Withdrawing consent");

	// Check if consent exists and belongs to user
	const existingConsent = await findConsentById({ tenantId, consentId });

	if (!existingConsent) {
		throw new NotFoundError(
			"Consent not found",
			ComplianceErrorCodes.CONSENT_NOT_FOUND,
		);
	}

	if (existingConsent.userId !== userId) {
		throw new NotFoundError(
			"Consent not found",
			ComplianceErrorCodes.CONSENT_NOT_FOUND,
		);
	}

	if (!existingConsent.granted) {
		throw new BadRequestError(
			"Consent is already withdrawn",
			ComplianceErrorCodes.CONSENT_ALREADY_WITHDRAWN,
		);
	}

	// Withdraw consent
	const updated = await withdrawConsent({
		tenantId,
		consentId,
		userId,
		ipAddress,
		userAgent,
	});

	if (!updated) {
		throw new NotFoundError(
			"Consent not found",
			ComplianceErrorCodes.CONSENT_NOT_FOUND,
		);
	}

	const result: WithdrawConsentOutput = {
		id: updated._id,
		purpose: updated.purpose,
		granted: updated.granted,
		withdrawnAt: updated.withdrawnAt?.toISOString() || new Date().toISOString(),
		message: ComplianceMessages.CONSENT_WITHDRAWN,
	};

	logSuccess(
		logger,
		{ consentId, purpose: updated.purpose },
		ComplianceMessages.CONSENT_WITHDRAWN,
	);

	return result;
}

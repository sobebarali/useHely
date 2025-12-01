/**
 * Record Consent Service
 *
 * Business logic for recording/updating consent
 */

import { createServiceLogger, logSuccess } from "@/lib/logger";
import { ComplianceMessages } from "../compliance.constants";
import { upsertConsent } from "../repositories/record-consent.compliance.repository";
import type {
	RecordConsentInput,
	RecordConsentOutput,
} from "../validations/record-consent.compliance.validation";

const logger = createServiceLogger("recordConsent");

export interface RecordConsentServiceResult {
	consent: RecordConsentOutput;
	isNew: boolean;
}

export async function recordConsentService({
	tenantId,
	userId,
	purpose,
	granted,
	source,
	ipAddress,
	userAgent,
}: {
	tenantId: string;
	userId: string;
	ipAddress?: string;
	userAgent?: string;
} & RecordConsentInput): Promise<RecordConsentServiceResult> {
	logger.info({ tenantId, userId, purpose, granted }, "Recording consent");

	const { consent, isNew } = await upsertConsent({
		tenantId,
		userId,
		purpose,
		granted,
		source,
		ipAddress,
		userAgent,
	});

	const result: RecordConsentOutput = {
		id: consent._id,
		purpose: consent.purpose,
		granted: consent.granted,
		grantedAt: consent.grantedAt?.toISOString() || null,
		withdrawnAt: consent.withdrawnAt?.toISOString() || null,
		version: consent.version,
	};

	logSuccess(
		logger,
		{ consentId: consent._id, isNew, granted },
		ComplianceMessages.CONSENT_RECORDED,
	);

	return { consent: result, isNew };
}

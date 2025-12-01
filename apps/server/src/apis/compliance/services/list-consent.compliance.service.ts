/**
 * List Consent Service
 *
 * Business logic for listing user consent records
 */

import { createServiceLogger, logSuccess } from "@/lib/logger";
import { CONSENT_PURPOSES } from "../compliance.constants";
import { findUserConsents } from "../repositories/list-consent.compliance.repository";
import type { ListConsentOutput } from "../validations/list-consent.compliance.validation";

const logger = createServiceLogger("listConsent");

export async function listConsentService({
	tenantId,
	userId,
}: {
	tenantId: string;
	userId: string;
}): Promise<ListConsentOutput> {
	logger.info({ tenantId, userId }, "Listing user consents");

	const consents = await findUserConsents({ tenantId, userId });

	// Transform to output format with descriptions
	const transformedConsents = consents.map((consent) => {
		const purposeInfo =
			CONSENT_PURPOSES[consent.purpose as keyof typeof CONSENT_PURPOSES];

		return {
			id: consent._id,
			purpose: consent.purpose,
			description: purposeInfo?.description || consent.description || null,
			granted: consent.granted,
			grantedAt: consent.grantedAt?.toISOString() || null,
			withdrawnAt: consent.withdrawnAt?.toISOString() || null,
			version: consent.version,
			source: consent.source,
		};
	});

	logSuccess(logger, { count: transformedConsents.length }, "Consents listed");

	return { consents: transformedConsents };
}

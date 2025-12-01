/**
 * Get Consent History Service
 *
 * Business logic for retrieving consent history
 */

import { createServiceLogger, logSuccess } from "@/lib/logger";
import { findConsentHistory } from "../repositories/get-consent-history.compliance.repository";
import type { GetConsentHistoryOutput } from "../validations/get-consent-history.compliance.validation";

const logger = createServiceLogger("getConsentHistory");

export async function getConsentHistoryService({
	tenantId,
	userId,
	purpose,
}: {
	tenantId: string;
	userId: string;
	purpose: string;
}): Promise<GetConsentHistoryOutput> {
	logger.info({ tenantId, userId, purpose }, "Getting consent history");

	const historyRecords = await findConsentHistory({
		tenantId,
		userId,
		purpose,
	});

	// Transform to output format
	const history = historyRecords.map((record) => ({
		action: record.action,
		timestamp: record.timestamp.toISOString(),
		source: record.source,
		ip: record.ipAddress || null,
	}));

	logSuccess(
		logger,
		{ purpose, count: history.length },
		"Consent history retrieved",
	);

	return {
		purpose,
		history,
	};
}

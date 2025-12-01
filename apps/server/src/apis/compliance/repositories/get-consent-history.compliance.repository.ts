/**
 * Get Consent History Repository
 *
 * Database operations for retrieving consent history
 */

import { ConsentHistory } from "@hms/db";
import { createRepositoryLogger, logDatabaseOperation } from "@/lib/logger";
import type { ConsentHistoryDocument } from "./shared.compliance.repository";

const logger = createRepositoryLogger("getConsentHistory");

/**
 * Find consent history for a specific purpose
 */
export async function findConsentHistory({
	tenantId,
	userId,
	purpose,
}: {
	tenantId: string;
	userId: string;
	purpose: string;
}): Promise<ConsentHistoryDocument[]> {
	logger.debug({ tenantId, userId, purpose }, "Finding consent history");

	const history = await ConsentHistory.find({
		tenantId,
		userId,
		purpose,
	})
		.sort({ timestamp: -1 })
		.lean<ConsentHistoryDocument[]>();

	logDatabaseOperation(
		logger,
		"find",
		"consent_history",
		{ tenantId, userId, purpose },
		{ count: history.length },
	);

	return history;
}

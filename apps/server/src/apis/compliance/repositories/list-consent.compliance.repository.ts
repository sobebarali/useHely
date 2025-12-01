/**
 * List Consent Repository
 *
 * Database operations for listing user consent records
 */

import { Consent } from "@hms/db";
import { createRepositoryLogger, logDatabaseOperation } from "@/lib/logger";
import type { ConsentDocument } from "./shared.compliance.repository";

const logger = createRepositoryLogger("listConsent");

/**
 * Find all consent records for a user
 */
export async function findUserConsents({
	tenantId,
	userId,
}: {
	tenantId: string;
	userId: string;
}): Promise<ConsentDocument[]> {
	logger.debug({ tenantId, userId }, "Finding user consents");

	const consents = await Consent.find({
		tenantId,
		userId,
	})
		.sort({ purpose: 1 })
		.lean<ConsentDocument[]>();

	logDatabaseOperation(
		logger,
		"find",
		"consent",
		{ tenantId, userId },
		{
			count: consents.length,
		},
	);

	return consents;
}

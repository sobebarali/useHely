/**
 * Withdraw Consent Repository
 *
 * Database operations for withdrawing consent
 */

import { Consent, ConsentHistory, ConsentHistoryAction } from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { createRepositoryLogger, logDatabaseOperation } from "@/lib/logger";
import type { ConsentDocument } from "./shared.compliance.repository";

const logger = createRepositoryLogger("withdrawConsent");

/**
 * Withdraw consent (set granted to false)
 */
export async function withdrawConsent({
	tenantId,
	consentId,
	userId,
	ipAddress,
	userAgent,
}: {
	tenantId: string;
	consentId: string;
	userId: string;
	ipAddress?: string;
	userAgent?: string;
}): Promise<ConsentDocument | null> {
	const now = new Date();

	logger.debug({ tenantId, consentId }, "Withdrawing consent");

	// Get existing consent for history
	const existingConsent = await Consent.findOne({
		_id: consentId,
		tenantId,
		userId,
	}).lean<ConsentDocument>();

	if (!existingConsent) {
		return null;
	}

	// Update consent
	const updated = await Consent.findOneAndUpdate(
		{ _id: consentId, tenantId, userId },
		{
			$set: {
				granted: false,
				withdrawnAt: now,
				ipAddress,
				userAgent,
				updatedAt: now,
			},
		},
		{ new: true },
	).lean<ConsentDocument>();

	if (updated) {
		// Create history entry
		const historyId = uuidv4();
		await ConsentHistory.create({
			_id: historyId,
			tenantId,
			consentId,
			userId,
			purpose: existingConsent.purpose,
			action: ConsentHistoryAction.WITHDRAWN,
			version: existingConsent.version,
			source: "settings",
			ipAddress,
			userAgent,
			timestamp: now,
			previousState: {
				granted: existingConsent.granted,
				grantedAt: existingConsent.grantedAt,
				withdrawnAt: existingConsent.withdrawnAt,
			},
		});

		logDatabaseOperation(
			logger,
			"update",
			"consent",
			{ tenantId, consentId },
			{
				withdrawn: true,
			},
		);
	}

	return updated;
}

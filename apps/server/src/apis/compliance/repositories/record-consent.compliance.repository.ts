/**
 * Record Consent Repository
 *
 * Database operations for recording/updating consent
 */

import { Consent, ConsentHistory, ConsentHistoryAction } from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { createRepositoryLogger, logDatabaseOperation } from "@/lib/logger";
import type { RecordConsentInput } from "../validations/record-consent.compliance.validation";
import type { ConsentDocument } from "./shared.compliance.repository";

const logger = createRepositoryLogger("recordConsent");

/**
 * Create or update consent record
 */
export async function upsertConsent({
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
} & RecordConsentInput): Promise<{
	consent: ConsentDocument;
	isNew: boolean;
}> {
	const now = new Date();

	logger.debug({ tenantId, userId, purpose, granted }, "Upserting consent");

	// Check if consent already exists
	const existingConsent = await Consent.findOne({
		tenantId,
		userId,
		purpose,
	}).lean<ConsentDocument>();

	let consent: ConsentDocument;
	let isNew: boolean;

	if (existingConsent) {
		// Update existing consent
		const updateData: Record<string, unknown> = {
			granted,
			source,
			ipAddress,
			userAgent,
			updatedAt: now,
		};

		if (granted && !existingConsent.granted) {
			updateData.grantedAt = now;
			updateData.withdrawnAt = null;
		} else if (!granted && existingConsent.granted) {
			updateData.withdrawnAt = now;
		}

		const updated = await Consent.findOneAndUpdate(
			{ _id: existingConsent._id, tenantId },
			{ $set: updateData },
			{ new: true },
		).lean<ConsentDocument>();

		if (!updated) {
			throw new Error("Failed to update consent record");
		}
		consent = updated;
		isNew = false;

		// Create history entry for update
		const historyId = uuidv4();
		await ConsentHistory.create({
			_id: historyId,
			tenantId,
			consentId: existingConsent._id,
			userId,
			purpose,
			action: granted
				? ConsentHistoryAction.GRANTED
				: ConsentHistoryAction.WITHDRAWN,
			version: existingConsent.version,
			source,
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
			{ tenantId, purpose },
			{
				_id: consent._id,
			},
		);
	} else {
		// Create new consent
		const consentId = uuidv4();
		await Consent.create({
			_id: consentId,
			tenantId,
			userId,
			purpose,
			granted,
			version: "1.0",
			source,
			ipAddress,
			userAgent,
			grantedAt: granted ? now : undefined,
			withdrawnAt: granted ? undefined : now,
		});

		// Fetch the created consent
		const newConsent =
			await Consent.findById(consentId).lean<ConsentDocument>();
		if (!newConsent) {
			throw new Error("Failed to create consent record");
		}
		consent = newConsent;
		isNew = true;

		// Create history entry for new consent
		const historyId = uuidv4();
		await ConsentHistory.create({
			_id: historyId,
			tenantId,
			consentId,
			userId,
			purpose,
			action: granted
				? ConsentHistoryAction.GRANTED
				: ConsentHistoryAction.WITHDRAWN,
			version: "1.0",
			source,
			ipAddress,
			userAgent,
			timestamp: now,
		});

		logDatabaseOperation(
			logger,
			"create",
			"consent",
			{ tenantId, purpose },
			{
				_id: consent._id,
			},
		);
	}

	return { consent, isNew };
}

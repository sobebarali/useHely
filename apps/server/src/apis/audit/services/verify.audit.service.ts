/**
 * Verify Integrity Service
 *
 * Business logic for verifying audit log chain integrity
 */

import crypto from "crypto";
import { createServiceLogger, logSuccess } from "@/lib/logger";
import { HASH_CHAIN_GENESIS } from "../audit.constants";
import { findAuditLogsForVerification } from "../repositories/shared.audit.repository";
import type {
	VerifyInput,
	VerifyOutput,
} from "../validations/verify.audit.validation";

const logger = createServiceLogger("verifyIntegrity");

interface VerifyParams extends VerifyInput {
	tenantId: string;
}

/**
 * Compute SHA-256 hash for integrity verification
 */
function computeHash(data: string, previousHash: string): string {
	return crypto
		.createHash("sha256")
		.update(data + previousHash)
		.digest("hex");
}

export async function verifyIntegrity(
	params: VerifyParams,
): Promise<VerifyOutput> {
	const { tenantId } = params;

	// Ensure dates are Date objects (query params may be strings)
	const startDate =
		params.startDate instanceof Date
			? params.startDate
			: new Date(params.startDate as unknown as string);
	const endDate =
		params.endDate instanceof Date
			? params.endDate
			: new Date(params.endDate as unknown as string);

	// Get all logs in the date range, sorted by timestamp (oldest first)
	const logs = await findAuditLogsForVerification({
		tenantId,
		startDate,
		endDate,
	});

	if (logs.length === 0) {
		return {
			verified: true,
			entriesChecked: 0,
			chainIntact: true,
			verifiedAt: new Date().toISOString(),
		};
	}

	// Verify each entry's hash matches computed hash
	let chainIntact = true;
	let failedAt: string | undefined;

	for (const log of logs) {
		// Reconstruct entry data for hash verification
		const entryData = JSON.stringify({
			eventId: log._id,
			tenantId: log.tenantId,
			eventType: log.eventType,
			category: log.category,
			userId: log.userId,
			userName: log.userName,
			action: log.action,
			resourceType: log.resourceType,
			resourceId: log.resourceId,
			ip: log.ip,
			userAgent: log.userAgent,
			sessionId: log.sessionId,
			details: log.details,
			before: log.before,
			after: log.after,
			timestamp: log.timestamp.toISOString(),
		});

		const previousHash = log.previousHash || HASH_CHAIN_GENESIS;
		const computedHash = computeHash(entryData, previousHash);

		if (computedHash !== log.hash) {
			chainIntact = false;
			failedAt = log._id;
			break;
		}
	}

	const result: VerifyOutput = {
		verified: chainIntact,
		entriesChecked: logs.length,
		chainIntact,
		...(failedAt && { failedAt }),
		verifiedAt: new Date().toISOString(),
	};

	logSuccess(
		logger,
		{
			entriesChecked: logs.length,
			chainIntact,
			failedAt,
		},
		"Integrity verification completed",
	);

	return result;
}

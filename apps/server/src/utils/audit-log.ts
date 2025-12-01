/**
 * Audit Log Utility
 *
 * Fire-and-forget audit log emission with cryptographic hash chain
 * for HIPAA compliance and tamper detection.
 */

import crypto from "node:crypto";
import {
	type AuditActionValue,
	type AuditEventCategoryValue,
	type AuditEventTypeValue,
	AuditLog,
} from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { HASH_CHAIN_GENESIS } from "../apis/audit/audit.constants";
import { createUtilLogger, logError } from "../lib/logger";

const logger = createUtilLogger("auditLog");

// In-memory cache for last hash (per tenant)
// In production, this should be stored in Redis for distributed systems
const lastHashCache = new Map<string, string>();

/**
 * Parameters for emitting an audit log entry
 */
export interface EmitAuditLogParams {
	tenantId: string;
	eventType: AuditEventTypeValue;
	category: AuditEventCategoryValue;
	userId: string;
	userName: string;
	action?: AuditActionValue;
	resourceType?: string;
	resourceId?: string;
	ip?: string;
	userAgent?: string;
	sessionId?: string;
	details?: Record<string, unknown>;
	before?: Record<string, unknown>;
	after?: Record<string, unknown>;
}

/**
 * Compute SHA-256 hash for integrity chain
 * Hash_N = SHA-256(Entry_N + Hash_N-1)
 */
function computeHash(data: string, previousHash: string): string {
	return crypto
		.createHash("sha256")
		.update(data + previousHash)
		.digest("hex");
}

/**
 * Get the previous hash for a tenant from cache or database
 */
async function getPreviousHash(tenantId: string): Promise<string> {
	// Check cache first
	const cachedHash = lastHashCache.get(tenantId);
	if (cachedHash) {
		return cachedHash;
	}

	// Query database for the most recent entry
	const lastEntry = await AuditLog.findOne({ tenantId })
		.sort({ timestamp: -1 })
		.select("hash")
		.lean();

	return lastEntry?.hash || HASH_CHAIN_GENESIS;
}

/**
 * Emit an audit log entry (fire-and-forget async write)
 *
 * This function creates an audit log record in MongoDB without blocking
 * the calling code. All errors are logged but not thrown.
 *
 * Features:
 * - Cryptographic hash chain for integrity verification
 * - Immutable append-only logs
 * - HIPAA compliant with 6-year retention
 *
 * @param params - Audit log parameters
 *
 * @example
 * ```typescript
 * emitAuditLog({
 *   tenantId: req.user.tenantId,
 *   eventType: AuditEventType.PHI_VIEW,
 *   category: AuditEventCategory.PHI,
 *   userId: req.user.id,
 *   userName: req.user.name,
 *   action: AuditAction.READ,
 *   resourceType: 'patient',
 *   resourceId: patientId,
 *   ip: req.ip,
 *   userAgent: req.get('user-agent'),
 *   details: { fieldsAccessed: ['firstName', 'lastName', 'diagnosis'] }
 * });
 * ```
 */
export function emitAuditLog(params: EmitAuditLogParams): void {
	const {
		tenantId,
		eventType,
		category,
		userId,
		userName,
		action,
		resourceType,
		resourceId,
		ip,
		userAgent,
		sessionId,
		details,
		before,
		after,
	} = params;

	// Fire-and-forget: run async but don't await
	(async () => {
		try {
			const eventId = uuidv4();
			const timestamp = new Date();

			logger.debug(
				{
					eventId,
					eventType,
					category,
					tenantId,
					userId,
				},
				"Emitting audit log",
			);

			// Get previous hash for chain integrity
			const previousHash = await getPreviousHash(tenantId);

			// Create entry data for hashing
			const entryData = JSON.stringify({
				eventId,
				tenantId,
				eventType,
				category,
				userId,
				userName,
				action,
				resourceType,
				resourceId,
				ip,
				userAgent,
				sessionId,
				details,
				before,
				after,
				timestamp: timestamp.toISOString(),
			});

			// Compute hash chain
			const hash = computeHash(entryData, previousHash);

			await AuditLog.create({
				_id: eventId,
				tenantId,
				eventType,
				category,
				userId,
				userName,
				action: action || null,
				resourceType: resourceType || null,
				resourceId: resourceId || null,
				ip: ip || null,
				userAgent: userAgent || null,
				sessionId: sessionId || null,
				details: details || null,
				before: before || null,
				after: after || null,
				hash,
				previousHash,
				timestamp,
			});

			// Update cache with new hash
			lastHashCache.set(tenantId, hash);

			logger.debug({ eventId, eventType }, "Audit log emitted successfully");
		} catch (error) {
			// Log error but don't throw (fire-and-forget)
			// This ensures audit log failures don't break application flow
			logError(logger, error, "Failed to emit audit log", {
				eventType,
				category,
				tenantId,
			});
		}
	})();
}

/**
 * Clear the hash cache for a tenant
 * Used primarily for testing
 */
export function clearHashCache(tenantId?: string): void {
	if (tenantId) {
		lastHashCache.delete(tenantId);
	} else {
		lastHashCache.clear();
	}
}

/**
 * Audit Log Utility
 *
 * Fire-and-forget audit log emission using BullMQ for background processing.
 * Hash chain computation and database writes are handled by the audit worker
 * for HIPAA compliance and tamper detection.
 */

import type {
	AuditActionValue,
	AuditEventCategoryValue,
	AuditEventTypeValue,
} from "@hms/db";
import { createUtilLogger, logError } from "../lib/logger";
import { enqueueAuditLog } from "../lib/queue";

const logger = createUtilLogger("auditLog");

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
 * Emit an audit log entry (fire-and-forget via queue)
 *
 * This function enqueues an audit log job for background processing.
 * The audit worker handles hash chain computation and database writes.
 *
 * Features:
 * - Cryptographic hash chain for integrity verification (computed by worker)
 * - Immutable append-only logs
 * - HIPAA compliant with 6-year retention
 * - Non-blocking - uses BullMQ for async processing
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

	// Fire-and-forget: enqueue but don't await
	enqueueAuditLog({
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
	}).catch((error) => {
		// Log error but don't throw (fire-and-forget)
		// This ensures audit log failures don't break application flow
		logError(logger, error, "Failed to enqueue audit log", {
			eventType,
			category,
			tenantId,
		});
	});

	logger.debug(
		{
			eventType,
			category,
			tenantId,
			userId,
		},
		"Audit log enqueued for processing",
	);
}

/**
 * @deprecated Hash cache is now managed by the audit worker
 * This function is kept for backward compatibility but is a no-op
 */
export function clearHashCache(_tenantId?: string): void {
	// No-op - hash cache is managed by the audit worker
	logger.debug("clearHashCache called - no-op, cache managed by worker");
}

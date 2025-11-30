import {
	SecurityEvent,
	type SecurityEventSeverityValue,
	type SecurityEventTypeValue,
} from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { createUtilLogger, logError } from "../lib/logger";

const logger = createUtilLogger("securityEvents");

/**
 * Security event emission parameters
 */
export interface EmitSecurityEventParams {
	type: SecurityEventTypeValue;
	severity: SecurityEventSeverityValue;
	tenantId?: string | null;
	userId?: string;
	ip?: string;
	userAgent?: string;
	details?: Record<string, unknown>;
}

/**
 * Emit a security event (fire-and-forget async write)
 *
 * This function creates a security event record in MongoDB without blocking
 * the calling code. All errors are logged but not thrown.
 *
 * @param params - Security event parameters
 *
 * @example
 * ```typescript
 * emitSecurityEvent({
 *   type: SecurityEventType.AUTH_FAILED,
 *   severity: SecurityEventSeverity.MEDIUM,
 *   tenantId: req.user.tenantId,
 *   userId: req.user.id,
 *   ip: req.ip,
 *   userAgent: req.get('user-agent'),
 *   details: { reason: 'Invalid token' }
 * });
 * ```
 */
export function emitSecurityEvent(params: EmitSecurityEventParams): void {
	const { type, severity, tenantId, userId, ip, userAgent, details } = params;

	// Fire-and-forget: run async but don't await
	(async () => {
		try {
			const eventId = uuidv4();

			logger.debug(
				{
					eventId,
					type,
					severity,
					tenantId,
					userId,
				},
				"Emitting security event",
			);

			await SecurityEvent.create({
				_id: eventId,
				type,
				severity,
				tenantId: tenantId || null,
				userId: userId || null,
				ip: ip || null,
				userAgent: userAgent || null,
				details: details || null,
				timestamp: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			logger.debug({ eventId, type }, "Security event emitted successfully");
		} catch (error) {
			// Log error but don't throw (fire-and-forget)
			// This ensures security event failures don't break application flow
			logError(logger, error, "Failed to emit security event", {
				type,
				severity,
			});
		}
	})();
}

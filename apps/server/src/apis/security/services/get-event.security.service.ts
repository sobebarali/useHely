/**
 * Get Security Event Service
 *
 * Business logic for retrieving a single security event
 */

import { NotFoundError } from "@/errors";
import { logger } from "@/lib/logger";
import { findSecurityEventById } from "../repositories/get-event.security.repository";
import type {
	GetEventInput,
	GetEventOutput,
} from "../validations/get-event.security.validation";

/**
 * Get a security event by ID
 *
 * Retrieves a single security event from the audit log.
 *
 * @throws {NotFoundError} If event is not found
 */
export async function getEvent({ id }: GetEventInput): Promise<GetEventOutput> {
	const startTime = Date.now();

	// Find event by ID
	const event = await findSecurityEventById({ id });

	if (!event) {
		logger.warn({ id }, "Security event not found");
		throw new NotFoundError("EVENT_NOT_FOUND", "Security event not found");
	}

	const duration = Date.now() - startTime;

	logger.info(
		{
			eventId: id,
			type: event.type,
			severity: event.severity,
			duration,
		},
		"Security event retrieved successfully",
	);

	return {
		id: event._id,
		type: event.type,
		severity: event.severity,
		tenantId: event.tenantId,
		userId: event.userId,
		ip: event.ip,
		userAgent: event.userAgent,
		details: event.details,
		timestamp: event.timestamp.toISOString(),
	};
}

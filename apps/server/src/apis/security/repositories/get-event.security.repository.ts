/**
 * Get Security Event Repository
 *
 * Database operations for retrieving a single security event
 */

import { SecurityEvent } from "@hms/db";

/**
 * Find a security event by ID
 */
export async function findSecurityEventById({ id }: { id: string }): Promise<{
	_id: string | null;
	type: string;
	severity: string;
	tenantId?: string | null;
	userId?: string | null;
	ip?: string | null;
	userAgent?: string | null;
	details?: Record<string, unknown>;
	timestamp: Date;
} | null> {
	const event = await SecurityEvent.findById(id)
		.select("_id type severity tenantId userId ip userAgent details timestamp")
		.lean();

	return event;
}

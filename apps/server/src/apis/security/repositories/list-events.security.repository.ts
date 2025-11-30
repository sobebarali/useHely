/**
 * List Security Events Repository
 *
 * Database operations for querying security events
 */

import { SecurityEvent } from "@hms/db";
import type { ListEventsInput } from "../validations/list-events.security.validation";

/**
 * Find security events with filters and pagination
 */
export async function findSecurityEvents({
	page,
	limit,
	severity,
	type,
	userId,
	tenantId,
	startDate,
	endDate,
}: ListEventsInput): Promise<{
	events: Array<{
		_id: string | null;
		type: string;
		severity: string;
		tenantId?: string | null;
		userId?: string | null;
		ip?: string | null;
		userAgent?: string | null;
		details?: Record<string, unknown>;
		timestamp: Date;
	}>;
	total: number;
}> {
	// Build filter query
	const filter: Record<string, unknown> = {};

	if (severity) {
		filter.severity = severity;
	}

	if (type) {
		filter.type = type;
	}

	if (userId) {
		filter.userId = userId;
	}

	if (tenantId) {
		filter.tenantId = tenantId;
	}

	// Date range filter
	if (startDate || endDate) {
		filter.timestamp = {};
		if (startDate) {
			(filter.timestamp as Record<string, Date>).$gte = startDate;
		}
		if (endDate) {
			(filter.timestamp as Record<string, Date>).$lte = endDate;
		}
	}

	// Calculate skip
	const skip = (page - 1) * limit;

	// Execute query
	const [events, total] = await Promise.all([
		SecurityEvent.find(filter)
			.sort({ timestamp: -1 })
			.skip(skip)
			.limit(limit)
			.select(
				"_id type severity tenantId userId ip userAgent details timestamp",
			)
			.lean(),
		SecurityEvent.countDocuments(filter),
	]);

	return { events, total };
}

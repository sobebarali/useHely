/**
 * List Security Events Service
 *
 * Business logic for listing and filtering security events
 */

import { logger } from "@/lib/logger";
import { findSecurityEvents } from "../repositories/list-events.security.repository";
import type {
	ListEventsInput,
	ListEventsOutput,
} from "../validations/list-events.security.validation";

/**
 * List security events with filtering and pagination
 *
 * Retrieves security audit events with optional filters for severity,
 * type, user, tenant, and date range. Results are paginated and sorted
 * by timestamp (most recent first).
 */
export async function listEvents(
	filters: ListEventsInput,
): Promise<ListEventsOutput> {
	const startTime = Date.now();

	// Query security events
	const { events, total } = await findSecurityEvents(filters);

	// Calculate pagination
	const pages = Math.ceil(total / filters.limit);

	// Transform events to output format
	const transformedEvents = events.map((event) => ({
		id: event._id,
		type: event.type,
		severity: event.severity,
		tenantId: event.tenantId,
		userId: event.userId,
		ip: event.ip,
		userAgent: event.userAgent,
		details: event.details,
		timestamp: event.timestamp.toISOString(),
	}));

	const duration = Date.now() - startTime;

	logger.info(
		{
			filters: {
				severity: filters.severity,
				type: filters.type,
				userId: filters.userId,
				tenantId: filters.tenantId,
				startDate: filters.startDate?.toISOString(),
				endDate: filters.endDate?.toISOString(),
			},
			page: filters.page,
			limit: filters.limit,
			total,
			pages,
			duration,
		},
		"Security events listed successfully",
	);

	return {
		events: transformedEvents,
		pagination: {
			page: filters.page,
			limit: filters.limit,
			total,
			pages,
		},
	};
}

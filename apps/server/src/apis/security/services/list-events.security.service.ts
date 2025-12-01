/**
 * List Security Events Service
 *
 * Business logic for listing and filtering security events
 */

import type { SecurityEventSeverity, SecurityEventType } from "@hms/db";
import { logger } from "@/lib/logger";
import { findSecurityEvents } from "../repositories/list-events.security.repository";
import type { ListEventsOutput } from "../validations/list-events.security.validation";

/**
 * List security events with filtering and pagination
 *
 * Retrieves security audit events with optional filters for severity,
 * type, user, tenant, and date range. Results are paginated and sorted
 * by timestamp (most recent first).
 */
export async function listEvents({
	page: pageParam = 1,
	limit: limitParam = 20,
	severity,
	type,
	userId,
	tenantId,
	startDate: startDateParam,
	endDate: endDateParam,
}: {
	page?: number | string;
	limit?: number | string;
	severity?: (typeof SecurityEventSeverity)[keyof typeof SecurityEventSeverity];
	type?: (typeof SecurityEventType)[keyof typeof SecurityEventType];
	userId?: string;
	tenantId?: string;
	startDate?: Date | string;
	endDate?: Date | string;
}): Promise<ListEventsOutput> {
	const startTime = Date.now();

	// Ensure page and limit are numbers with bounds
	const page = Math.max(
		1,
		typeof pageParam === "string" ? Number.parseInt(pageParam, 10) : pageParam,
	);
	const limit = Math.min(
		100,
		Math.max(
			1,
			typeof limitParam === "string"
				? Number.parseInt(limitParam, 10)
				: limitParam,
		),
	);

	// Convert string dates to Date objects
	const startDate = startDateParam
		? typeof startDateParam === "string"
			? new Date(startDateParam)
			: startDateParam
		: undefined;
	const endDate = endDateParam
		? typeof endDateParam === "string"
			? new Date(endDateParam)
			: endDateParam
		: undefined;

	// Query security events
	const { events, total } = await findSecurityEvents({
		page,
		limit,
		severity,
		type,
		userId,
		tenantId,
		startDate,
		endDate,
	});

	// Calculate pagination
	const pages = Math.ceil(total / limit);

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
				severity,
				type,
				userId,
				tenantId,
				startDate: startDate?.toISOString(),
				endDate: endDate?.toISOString(),
			},
			page,
			limit,
			total,
			pages,
			duration,
		},
		"Security events listed successfully",
	);

	return {
		events: transformedEvents,
		pagination: {
			page,
			limit,
			total,
			pages,
		},
	};
}

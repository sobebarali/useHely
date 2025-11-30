/**
 * List Security Events Validation
 *
 * Endpoint: GET /api/security/events
 * Description: List security events with filtering and pagination
 * Auth: Required (SECURITY:READ permission)
 */

import { SecurityEventSeverity, SecurityEventType } from "@hms/db";
import { z } from "zod";

// Query parameters schema
export const listEventsQuerySchema = z.object({
	query: z.object({
		// Pagination
		page: z
			.string()
			.optional()
			.default("1")
			.transform((val) => Math.max(1, Number.parseInt(val, 10))),
		limit: z
			.string()
			.optional()
			.default("20")
			.transform((val) => Math.min(100, Math.max(1, Number.parseInt(val, 10)))),

		// Filters
		severity: z
			.enum([
				SecurityEventSeverity.LOW,
				SecurityEventSeverity.MEDIUM,
				SecurityEventSeverity.HIGH,
				SecurityEventSeverity.CRITICAL,
			])
			.optional(),

		type: z
			.enum([
				SecurityEventType.AUTH_FAILED,
				SecurityEventType.AUTH_LOCKOUT,
				SecurityEventType.PERMISSION_DENIED,
				SecurityEventType.MFA_FAILED,
				SecurityEventType.MFA_ENABLED,
				SecurityEventType.MFA_DISABLED,
				SecurityEventType.SUSPICIOUS_ACTIVITY,
				SecurityEventType.KEY_ROTATION,
				SecurityEventType.ADMIN_ACTION,
			])
			.optional(),

		userId: z.string().optional(),
		tenantId: z.string().optional(),

		// Date range filters (ISO 8601 strings)
		startDate: z
			.string()
			.datetime()
			.optional()
			.transform((val) => (val ? new Date(val) : undefined)),
		endDate: z
			.string()
			.datetime()
			.optional()
			.transform((val) => (val ? new Date(val) : undefined)),
	}),
});

export type ListEventsInput = z.infer<typeof listEventsQuerySchema>["query"];

export interface SecurityEventListItem {
	id: string | null;
	type: string;
	severity: string;
	tenantId?: string | null;
	userId?: string | null;
	ip?: string | null;
	userAgent?: string | null;
	details?: Record<string, unknown>;
	timestamp: string; // ISO 8601
}

export interface ListEventsOutput {
	events: SecurityEventListItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	};
}

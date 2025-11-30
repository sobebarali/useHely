/**
 * Get Security Event Validation
 *
 * Endpoint: GET /api/security/events/:id
 * Description: Get a specific security event by ID
 * Auth: Required (SECURITY:READ permission)
 */

import { z } from "zod";

// Path parameters schema
export const getEventParamsSchema = z.object({
	params: z.object({
		id: z.string().min(1, "Event ID is required"),
	}),
});

export type GetEventInput = z.infer<typeof getEventParamsSchema>["params"];

export interface GetEventOutput {
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

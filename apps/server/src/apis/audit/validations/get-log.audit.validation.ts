/**
 * Get Audit Log Validation
 *
 * Endpoint: GET /api/audit/logs/:id
 * Description: Get a specific audit log entry with full details
 * Auth: Required (AUDIT:READ permission)
 */

import { z } from "zod";

// Path parameters schema
export const getLogParamsSchema = z.object({
	params: z.object({
		id: z.string().min(1, "Audit log ID is required"),
	}),
});

export type GetLogInput = z.infer<typeof getLogParamsSchema>["params"];

export interface AuditLogDetail {
	id: string;
	eventType: string;
	category: string;
	userId: string;
	userName: string;
	tenantId: string;
	resourceType?: string | null;
	resourceId?: string | null;
	action?: string | null;
	ip?: string | null;
	userAgent?: string | null;
	sessionId?: string | null;
	details?: Record<string, unknown> | null;
	before?: Record<string, unknown> | null;
	after?: Record<string, unknown> | null;
	hash: string;
	timestamp: string; // ISO 8601
}

export interface GetLogOutput {
	log: AuditLogDetail;
}

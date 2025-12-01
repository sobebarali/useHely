/**
 * Resource Trail Validation
 *
 * Endpoint: GET /api/audit/resources/:resourceType/:resourceId/trail
 * Description: Get complete audit trail for a specific resource
 * Auth: Required (AUDIT:READ permission)
 */

import { z } from "zod";
import {
	AUDIT_DEFAULT_LIMIT,
	AUDIT_DEFAULT_PAGE,
	AUDIT_MAX_LIMIT,
	AuditResourceType,
} from "../audit.constants";

// Path and query parameters schema
export const resourceTrailSchema = z.object({
	params: z.object({
		resourceType: z.enum([
			AuditResourceType.PATIENT,
			AuditResourceType.PRESCRIPTION,
			AuditResourceType.VITALS,
			AuditResourceType.USER,
			AuditResourceType.ROLE,
			AuditResourceType.DEPARTMENT,
			AuditResourceType.APPOINTMENT,
			AuditResourceType.ADMISSION,
			AuditResourceType.INVENTORY,
			AuditResourceType.DISPENSING,
		]),
		resourceId: z.string().min(1, "Resource ID is required"),
	}),
	query: z.object({
		page: z.coerce
			.number()
			.int()
			.positive()
			.default(AUDIT_DEFAULT_PAGE)
			.optional(),
		limit: z.coerce
			.number()
			.int()
			.positive()
			.max(AUDIT_MAX_LIMIT)
			.default(AUDIT_DEFAULT_LIMIT)
			.optional(),
	}),
});

export type ResourceTrailParams = z.infer<typeof resourceTrailSchema>["params"];
export type ResourceTrailQuery = z.infer<typeof resourceTrailSchema>["query"];

export interface ResourceTrailItem {
	id: string;
	eventType: string;
	category: string;
	userId: string;
	userName: string;
	action?: string | null;
	ip?: string | null;
	details?: Record<string, unknown> | null;
	before?: Record<string, unknown> | null;
	after?: Record<string, unknown> | null;
	timestamp: string;
}

export interface ResourceTrailOutput {
	resourceType: string;
	resourceId: string;
	logs: ResourceTrailItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

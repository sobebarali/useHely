/**
 * User Trail Validation
 *
 * Endpoint: GET /api/audit/users/:userId/trail
 * Description: Get complete audit trail for a specific user
 * Auth: Required (AUDIT:READ permission)
 */

import { z } from "zod";
import {
	AUDIT_DEFAULT_LIMIT,
	AUDIT_DEFAULT_PAGE,
	AUDIT_MAX_LIMIT,
} from "../audit.constants";

// Path and query parameters schema
export const userTrailSchema = z.object({
	params: z.object({
		userId: z.string().min(1, "User ID is required"),
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
		startDate: z
			.string()
			.optional()
			.transform((val) => (val ? new Date(val) : undefined)),
		endDate: z
			.string()
			.optional()
			.transform((val) => (val ? new Date(val) : undefined)),
	}),
});

export type UserTrailParams = z.infer<typeof userTrailSchema>["params"];
export type UserTrailQuery = z.infer<typeof userTrailSchema>["query"];

export interface UserTrailItem {
	id: string;
	eventType: string;
	category: string;
	resourceType?: string | null;
	resourceId?: string | null;
	action?: string | null;
	ip?: string | null;
	details?: Record<string, unknown> | null;
	timestamp: string;
}

export interface UserTrailOutput {
	userId: string;
	logs: UserTrailItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

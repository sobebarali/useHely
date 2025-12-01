/**
 * List Requests Validation
 *
 * Endpoint: GET /api/compliance/requests
 * Description: List all data subject requests (admin view)
 * Auth: Required with COMPLIANCE:READ permission
 */

import { z } from "zod";

export const listRequestsSchema = z.object({
	query: z.object({
		type: z.enum(["export", "deletion", "all"]).optional().default("all"),
		status: z.string().optional(),
		startDate: z.string().optional(),
		endDate: z.string().optional(),
		page: z.coerce.number().int().positive().optional().default(1),
		limit: z.coerce.number().int().positive().max(100).optional().default(20),
	}),
});

export type ListRequestsInput = z.infer<typeof listRequestsSchema>["query"];

export type ListRequestsOutput = {
	data: Array<{
		requestId: string;
		type: string;
		userId: string;
		userEmail: string;
		status: string;
		createdAt: string;
		scheduledCompletion?: string;
	}>;
	pagination: {
		page: number;
		limit: number;
		total: number;
	};
};

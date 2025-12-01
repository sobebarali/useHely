/**
 * Get Export Status Validation
 *
 * Endpoint: GET /api/compliance/data-export/:requestId
 * Description: Check status of a data export request
 * Auth: Required
 */

import { z } from "zod";

export const getExportStatusSchema = z.object({
	params: z.object({
		requestId: z.string().min(1, "Request ID is required"),
	}),
});

export type GetExportStatusInput = z.infer<
	typeof getExportStatusSchema
>["params"];

export interface GetExportStatusOutput {
	requestId: string;
	type: string;
	status: string;
	format: string;
	createdAt: string;
	completedAt: string | null;
	downloadUrl: string | null;
	expiresAt: string | null;
}

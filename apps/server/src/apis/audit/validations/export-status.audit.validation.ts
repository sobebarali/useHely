/**
 * Export Status Validation
 *
 * Endpoint: GET /api/audit/export/:exportId
 * Description: Check export job status and get download URL when ready
 * Auth: Required (AUDIT:EXPORT permission)
 */

import { z } from "zod";

// Path parameters schema
export const exportStatusSchema = z.object({
	params: z.object({
		exportId: z.string().min(1, "Export ID is required"),
	}),
});

export type ExportStatusInput = z.infer<typeof exportStatusSchema>["params"];

export interface ExportStatusOutput {
	exportId: string;
	status: string;
	format: string;
	estimatedRecords: number;
	processedRecords: number;
	downloadUrl: string | null;
	errorMessage: string | null;
	createdAt: string;
	completedAt: string | null;
}

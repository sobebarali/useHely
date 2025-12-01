/**
 * Request Data Export Validation
 *
 * Endpoint: POST /api/compliance/data-export
 * Description: Request export of all personal data
 * Auth: Required
 */

import { DataExportFormat } from "@hms/db";
import { z } from "zod";

export const requestExportSchema = z.object({
	body: z.object({
		format: z
			.enum([DataExportFormat.JSON, DataExportFormat.CSV])
			.optional()
			.default(DataExportFormat.JSON),
		includeAuditLog: z.boolean().optional().default(true),
	}),
});

export type RequestExportInput = z.infer<typeof requestExportSchema>["body"];

export type RequestExportOutput = {
	requestId: string;
	type: string;
	status: string;
	format: string;
	createdAt: string;
	estimatedCompletion: string;
};

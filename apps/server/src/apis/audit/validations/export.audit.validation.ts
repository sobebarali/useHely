/**
 * Export Audit Logs Validation
 *
 * Endpoint: POST /api/audit/export
 * Description: Export audit logs for archival or external analysis
 * Auth: Required (AUDIT:EXPORT permission)
 */

import { z } from "zod";
import { AuditEventCategory, AuditExportFormat } from "../audit.constants";

// Request body schema
export const exportSchema = z.object({
	body: z.object({
		startDate: z.string().transform((val) => new Date(val)),
		endDate: z.string().transform((val) => new Date(val)),
		format: z
			.enum([
				AuditExportFormat.JSON,
				AuditExportFormat.CSV,
				AuditExportFormat.PARQUET,
			])
			.optional()
			.default(AuditExportFormat.JSON),
		categories: z
			.array(
				z.enum([
					AuditEventCategory.AUTH,
					AuditEventCategory.PHI,
					AuditEventCategory.ADMIN,
					AuditEventCategory.SECURITY,
					AuditEventCategory.DATA,
				]),
			)
			.optional(),
	}),
});

export type ExportInput = z.infer<typeof exportSchema>["body"];

export interface ExportOutput {
	exportId: string;
	status: string;
	estimatedRecords: number;
	downloadUrl: string | null;
}

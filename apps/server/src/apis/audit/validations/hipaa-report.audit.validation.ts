/**
 * HIPAA Report Validation
 *
 * Endpoint: GET /api/audit/reports/hipaa
 * Description: Generate HIPAA compliance report for a date range
 * Auth: Required (AUDIT:REPORT permission)
 */

import { z } from "zod";
import { ReportFormat } from "../audit.constants";

// Query parameters schema
export const hipaaReportSchema = z.object({
	query: z.object({
		startDate: z.string().transform((val) => new Date(val)),
		endDate: z.string().transform((val) => new Date(val)),
		format: z
			.enum([ReportFormat.JSON, ReportFormat.PDF])
			.optional()
			.default(ReportFormat.JSON),
	}),
});

export type HipaaReportInput = z.infer<typeof hipaaReportSchema>["query"];

export interface PhiAccessByUser {
	userId: string;
	userName: string;
	role?: string;
	accessCount: number;
	uniquePatients: number;
}

export interface SecurityIncident {
	type: string;
	count: number;
	uniqueUsers: number;
}

export interface HipaaReportOutput {
	reportId: string;
	period: {
		start: string;
		end: string;
	};
	summary: {
		totalEvents: number;
		phiAccessEvents: number;
		uniqueUsers: number;
		uniquePatients: number;
		failedAccessAttempts: number;
		securityEvents: number;
	};
	phiAccessByUser: PhiAccessByUser[];
	phiAccessByRole: Record<string, number>;
	securityIncidents: SecurityIncident[];
	generatedAt: string;
}

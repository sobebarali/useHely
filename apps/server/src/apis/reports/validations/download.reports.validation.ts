/**
 * Download report validation
 *
 * Schema and types for GET /api/reports/:reportId/download
 * Downloads a previously generated report
 */

import { z } from "zod";

export const downloadReportSchema = z.object({
	params: z.object({
		reportId: z.string().min(1),
	}),
});

export type DownloadReportInput = {
	tenantId: string;
	reportId: string;
};

export type DownloadReportOutput = {
	reportId: string;
	reportType: string;
	format: string;
	data: unknown;
	generatedAt: string;
};

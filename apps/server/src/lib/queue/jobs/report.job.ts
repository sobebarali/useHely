/**
 * Report Job Definitions
 *
 * Type definitions and helpers for report generation background jobs
 */

import { reportQueue } from "../queues";

// Job types
export const REPORT_JOB_TYPES = {
	GENERATE_REPORT: "generate-report",
} as const;

export type ReportJobType =
	(typeof REPORT_JOB_TYPES)[keyof typeof REPORT_JOB_TYPES];

// Job data types
export interface GenerateReportJobData {
	reportId: string;
	tenantId: string;
	reportType: string;
	parameters: Record<string, unknown>;
	format: string;
	staffId: string;
	staffName: string;
}

// Job enqueueing helpers
export async function enqueueReportGeneration(
	data: GenerateReportJobData,
): Promise<string> {
	const job = await reportQueue.add(REPORT_JOB_TYPES.GENERATE_REPORT, data, {
		jobId: `report-${data.reportId}`, // Dedupe by report ID
	});
	return job.id ?? "";
}

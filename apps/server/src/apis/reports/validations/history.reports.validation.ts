/**
 * History reports validation
 *
 * Schema and types for GET /api/reports/history
 * Returns previously generated reports
 */

import { ReportType } from "@hms/db";
import { z } from "zod";

/**
 * ISO date string validation helper
 */
const dateStringSchema = z
	.string()
	.refine((val) => !Number.isNaN(Date.parse(val)), {
		message: "Invalid date format. Use ISO 8601 format (e.g., 2024-01-01)",
	});

const historyQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	reportType: z
		.enum(Object.values(ReportType) as [string, ...string[]])
		.optional(),
	startDate: dateStringSchema.optional(),
	endDate: dateStringSchema.optional(),
});

export const historyReportsSchema = z.object({
	query: historyQuerySchema,
});

export type HistoryReportsInput = z.infer<typeof historyQuerySchema> & {
	tenantId: string;
};

export type ReportHistoryItem = {
	reportId: string;
	reportType: string;
	parameters: Record<string, unknown>;
	format: string;
	generatedBy: {
		id: string;
		name: string;
	};
	generatedAt: string;
	expiresAt: string;
	status: string;
};

export type HistoryReportsOutput = {
	data: ReportHistoryItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

/**
 * List reports validation
 *
 * Schema and types for GET /api/reports
 * Returns list of available report types
 */

import { z } from "zod";

// No input parameters required for listing reports
// Empty schema validates successfully with no requirements
export const listReportsSchema = z.object({
	query: z.object({}).optional(),
});

export type ListReportsInput = {
	tenantId: string;
};

// Report type info output
export type ReportTypeInfo = {
	id: string;
	name: string;
	description: string;
	category: string;
	parameters: {
		name: string;
		type: string;
		required: boolean;
		description: string;
	}[];
	formats: string[];
	requiredPermission: string;
};

export type ListReportsOutput = {
	reports: ReportTypeInfo[];
};

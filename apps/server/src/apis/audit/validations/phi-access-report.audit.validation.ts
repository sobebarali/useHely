/**
 * PHI Access Report Validation
 *
 * Endpoint: GET /api/audit/reports/phi-access
 * Description: Generate detailed PHI access report
 * Auth: Required (AUDIT:REPORT permission)
 */

import { z } from "zod";
import {
	AUDIT_DEFAULT_LIMIT,
	AUDIT_DEFAULT_PAGE,
	AUDIT_MAX_LIMIT,
} from "../audit.constants";

// Query parameters schema
export const phiAccessReportSchema = z.object({
	query: z.object({
		startDate: z.string().transform((val) => new Date(val)),
		endDate: z.string().transform((val) => new Date(val)),
		patientId: z.string().optional(),
		userId: z.string().optional(),
		page: z.coerce
			.number()
			.int()
			.positive()
			.default(AUDIT_DEFAULT_PAGE)
			.optional(),
		limit: z.coerce
			.number()
			.int()
			.positive()
			.max(AUDIT_MAX_LIMIT)
			.default(AUDIT_DEFAULT_LIMIT)
			.optional(),
	}),
});

export type PhiAccessReportInput = z.infer<
	typeof phiAccessReportSchema
>["query"];

export interface PhiAccessItem {
	id: string;
	eventType: string;
	userId: string;
	userName: string;
	patientId?: string | null;
	action?: string | null;
	fieldsAccessed?: string[];
	ip?: string | null;
	timestamp: string;
}

export interface PhiAccessReportOutput {
	period: {
		start: string;
		end: string;
	};
	filters: {
		patientId?: string;
		userId?: string;
	};
	logs: PhiAccessItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

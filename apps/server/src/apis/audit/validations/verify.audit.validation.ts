/**
 * Verify Integrity Validation
 *
 * Endpoint: POST /api/audit/verify
 * Description: Verify integrity of audit log chain for a date range
 * Auth: Required (AUDIT:MANAGE permission)
 */

import { z } from "zod";

// Request body schema
export const verifySchema = z.object({
	body: z.object({
		startDate: z.string().transform((val) => new Date(val)),
		endDate: z.string().transform((val) => new Date(val)),
	}),
});

export type VerifyInput = z.infer<typeof verifySchema>["body"];

export interface VerifyOutput {
	verified: boolean;
	entriesChecked: number;
	chainIntact: boolean;
	failedAt?: string;
	verifiedAt: string;
}

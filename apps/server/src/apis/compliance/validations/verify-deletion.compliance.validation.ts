/**
 * Verify Deletion Validation
 *
 * Endpoint: POST /api/compliance/data-deletion/:requestId/verify
 * Description: Verify deletion request via token from email
 * Auth: Required
 */

import { z } from "zod";

export const verifyDeletionSchema = z.object({
	params: z.object({
		requestId: z.string().uuid("Invalid request ID format"),
	}),
	body: z.object({
		token: z.string().min(1, "Verification token is required"),
	}),
});

export type VerifyDeletionInput = z.infer<typeof verifyDeletionSchema>;

export interface VerifyDeletionOutput {
	requestId: string;
	status: string;
	scheduledDeletion: string;
	message: string;
}

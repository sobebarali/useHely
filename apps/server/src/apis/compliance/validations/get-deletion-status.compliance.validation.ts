/**
 * Get Deletion Status Validation
 *
 * Endpoint: GET /api/compliance/data-deletion/:requestId
 * Description: Check status of a deletion request
 * Auth: Required
 */

import { z } from "zod";

export const getDeletionStatusSchema = z.object({
	params: z.object({
		requestId: z.string().uuid("Invalid request ID format"),
	}),
});

export type GetDeletionStatusInput = z.infer<typeof getDeletionStatusSchema>;

export type GetDeletionStatusOutput = {
	requestId: string;
	type: string;
	status: string;
	createdAt: string;
	verifiedAt?: string;
	scheduledDeletion?: string;
	canCancel: boolean;
	gracePeriodEnds?: string;
};

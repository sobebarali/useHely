/**
 * Cancel Deletion Validation
 *
 * Endpoint: POST /api/compliance/data-deletion/:requestId/cancel
 * Description: Cancel a pending deletion request during grace period
 * Auth: Required
 */

import { z } from "zod";

export const cancelDeletionSchema = z.object({
	params: z.object({
		requestId: z.string().uuid("Invalid request ID format"),
	}),
});

export type CancelDeletionInput = z.infer<typeof cancelDeletionSchema>;

export type CancelDeletionOutput = {
	requestId: string;
	status: string;
	message: string;
};

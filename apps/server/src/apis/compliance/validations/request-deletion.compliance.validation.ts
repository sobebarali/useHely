/**
 * Request Deletion Validation
 *
 * Endpoint: POST /api/compliance/data-deletion
 * Description: Request deletion of all personal data
 * Auth: Required
 */

import { z } from "zod";

export const requestDeletionSchema = z.object({
	body: z.object({
		reason: z.string().optional(),
		confirmEmail: z.string().email("Invalid email format"),
	}),
});

export type RequestDeletionInput = z.infer<
	typeof requestDeletionSchema
>["body"];

export interface RequestDeletionOutput {
	requestId: string;
	type: string;
	status: string;
	createdAt: string;
	message: string;
}

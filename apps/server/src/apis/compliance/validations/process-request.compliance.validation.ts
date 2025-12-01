/**
 * Process Request Validation
 *
 * Endpoint: PUT /api/compliance/requests/:requestId/process
 * Description: Manually process or expedite a data request
 * Auth: Required with COMPLIANCE:MANAGE permission
 */

import { z } from "zod";

export const processRequestSchema = z.object({
	params: z.object({
		requestId: z.string().uuid("Invalid request ID format"),
	}),
	body: z.object({
		action: z.enum(["approve", "reject", "expedite"]),
		notes: z.string().optional(),
	}),
});

export type ProcessRequestInput = z.infer<typeof processRequestSchema>;

export type ProcessRequestOutput = {
	requestId: string;
	status: string;
	processedBy: string;
	processedAt: string;
};

import { z } from "zod";

// Zod schema for runtime validation
export const cancelAppointmentSchema = z.object({
	params: z.object({
		id: z.string().uuid("Invalid appointment ID"),
	}),
	body: z
		.object({
			reason: z.string().max(500).optional(),
		})
		.optional()
		.default({}),
});

// Input type - inferred from Zod (single source of truth)
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

// User who cancelled
export interface CancelledByInfo {
	id: string;
	firstName: string;
	lastName: string;
}

// Output type - manually defined for response structure
export interface CancelAppointmentOutput {
	id: string;
	status: string;
	cancelledAt: string;
	cancelledBy: CancelledByInfo;
	cancellationReason?: string;
}

import { z } from "zod";

// Zod schema for runtime validation
export const completeAppointmentSchema = z.object({
	params: z.object({
		id: z.string().uuid("Invalid appointment ID"),
	}),
	body: z
		.object({
			notes: z.string().max(2000).optional(),
			followUpRequired: z.boolean().optional(),
			followUpDate: z.string().datetime().optional(),
		})
		.optional()
		.default({}),
});

// Input type - inferred from Zod (single source of truth)
export type CompleteAppointmentInput = z.infer<
	typeof completeAppointmentSchema
>;

// Output type - manually defined for response structure
export interface CompleteAppointmentOutput {
	id: string;
	status: string;
	completedAt: string;
	notes?: string;
	followUpRequired?: boolean;
	followUpDate?: string;
}

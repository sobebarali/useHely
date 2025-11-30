import { z } from "zod";

// Zod schema for runtime validation
export const checkInAppointmentSchema = z.object({
	params: z.object({
		id: z.string().uuid("Invalid appointment ID"),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type CheckInAppointmentInput = z.infer<
	typeof checkInAppointmentSchema.shape.params
>;

// Output type - manually defined for response structure
export interface CheckInAppointmentOutput {
	id: string;
	status: string;
	queueNumber: number;
	checkedInAt: string;
	estimatedWait: number;
}

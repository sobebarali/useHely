import { z } from "zod";

// Zod schema for runtime validation
export const getAvailabilitySchema = z.object({
	params: z.object({
		doctorId: z.string().uuid("Invalid doctor ID"),
	}),
	query: z.object({
		date: z
			.string()
			.regex(
				/^\d{4}-\d{2}-\d{2}$/,
				"Invalid date format. Use YYYY-MM-DD format.",
			),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type GetAvailabilityInput = z.infer<typeof getAvailabilitySchema>;

// Time slot with availability status
export interface AvailableSlot {
	id: string;
	startTime: string;
	endTime: string;
	available: boolean;
}

// Output type - manually defined for response structure
export interface GetAvailabilityOutput {
	doctorId: string;
	date: string;
	slots: AvailableSlot[];
}

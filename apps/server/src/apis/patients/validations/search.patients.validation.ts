import { z } from "zod";

// Zod schema for runtime validation
export const searchPatientsSchema = z.object({
	query: z.object({
		q: z.string().min(2, "Search query must be at least 2 characters"),
		type: z.enum(["id", "name", "phone", "email"]).optional(),
		limit: z.coerce.number().int().positive().max(50).default(10).optional(),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type SearchPatientsInput = z.infer<
	typeof searchPatientsSchema.shape.query
>;

// Output type - manually defined for response structure
export interface SearchPatientsOutput {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
	phone: string;
	email?: string;
	patientType: string;
	status: string;
}

import { z } from "zod";

// Zod schema for runtime validation
export const listPatientsSchema = z.object({
	query: z.object({
		page: z.coerce.number().int().positive().default(1).optional(),
		limit: z.coerce.number().int().positive().max(100).default(20).optional(),
		patientType: z.enum(["OPD", "IPD"]).optional(),
		department: z.string().optional(),
		assignedDoctor: z.string().optional(),
		status: z
			.enum(["ACTIVE", "DISCHARGED", "COMPLETED", "INACTIVE"])
			.optional(),
		startDate: z.string().optional(),
		endDate: z.string().optional(),
		search: z.string().optional(),
		sortBy: z.string().default("createdAt").optional(),
		sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type ListPatientsInput = z.infer<typeof listPatientsSchema.shape.query>;

// Output type - manually defined for response structure
export interface ListPatientsOutput {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
	dateOfBirth: string;
	gender: string;
	phone: string;
	patientType: string;
	department: string;
	status: string;
	createdAt: string;
}

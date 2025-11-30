import { z } from "zod";

// Zod schema for runtime validation
export const listPrescriptionsSchema = z.object({
	query: z.object({
		page: z.coerce.number().int().positive().default(1).optional(),
		limit: z.coerce.number().int().positive().max(100).default(20).optional(),
		patientId: z.string().optional(),
		doctorId: z.string().optional(),
		status: z
			.enum(["PENDING", "DISPENSING", "DISPENSED", "COMPLETED", "CANCELLED"])
			.optional(),
		startDate: z.string().optional(),
		endDate: z.string().optional(),
		sortBy: z.string().default("createdAt").optional(),
		sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type ListPrescriptionsInput = z.infer<
	typeof listPrescriptionsSchema.shape.query
>;

// Output type - manually defined for response structure
export interface PrescriptionSummary {
	id: string;
	prescriptionId: string;
	patient: {
		id: string;
		patientId: string;
		firstName: string;
		lastName: string;
	};
	doctor: {
		id: string;
		firstName: string;
		lastName: string;
	};
	diagnosis: string;
	medicineCount: number;
	status: string;
	createdAt: string;
}

export interface ListPrescriptionsOutput {
	data: PrescriptionSummary[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

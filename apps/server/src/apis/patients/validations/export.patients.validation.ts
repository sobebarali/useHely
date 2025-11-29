import { z } from "zod";

// Zod schema for runtime validation
export const exportPatientsSchema = z.object({
	query: z.object({
		format: z.enum(["csv", "pdf"]),
		patientType: z.enum(["OPD", "IPD"]).optional(),
		department: z.string().optional(),
		startDate: z.string().optional(),
		endDate: z.string().optional(),
		fields: z.string().optional(), // Comma-separated field list
	}),
});

// Input type - inferred from Zod (single source of truth)
export type ExportPatientsInput = z.infer<
	typeof exportPatientsSchema.shape.query
>;

// Default export fields
export const DEFAULT_EXPORT_FIELDS = [
	"patientId",
	"firstName",
	"lastName",
	"dateOfBirth",
	"gender",
	"phone",
	"patientType",
	"department",
	"status",
	"createdAt",
];

// Maximum records per export
export const MAX_EXPORT_RECORDS = 10000;

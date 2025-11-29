import { z } from "zod";

// Address sub-schema (optional fields for update)
const addressSchema = z.object({
	street: z.string().min(1).optional(),
	city: z.string().min(1).optional(),
	state: z.string().min(1).optional(),
	postalCode: z.string().min(1).optional(),
	country: z.string().min(1).optional(),
});

// Emergency contact sub-schema (optional fields for update)
const emergencyContactSchema = z.object({
	name: z.string().min(1).optional(),
	relationship: z.string().min(1).optional(),
	phone: z.string().min(1).optional(),
});

// Zod schema for runtime validation
export const updatePatientSchema = z.object({
	params: z.object({
		id: z.string().min(1, "Patient ID is required"),
	}),
	body: z.object({
		phone: z.string().min(1).optional(),
		email: z.string().email().optional(),
		address: addressSchema.optional(),
		emergencyContact: emergencyContactSchema.optional(),
		department: z.string().optional(),
		assignedDoctor: z.string().optional(),
		patientType: z.enum(["OPD", "IPD"]).optional(),
		photo: z
			.string()
			.optional()
			.refine(
				(val) => {
					if (!val) return true;
					// Check if base64 and within size limit (5MB = ~6.67MB base64)
					const base64Regex = /^data:image\/(jpeg|jpg|png);base64,/;
					if (!base64Regex.test(val)) return false;
					// Rough size check (base64 is ~33% larger than binary)
					const base64Data = val.split(",")[1] || "";
					const sizeInBytes = (base64Data.length * 3) / 4;
					return sizeInBytes <= 5 * 1024 * 1024; // 5MB limit
				},
				{
					message:
						"Photo must be a valid base64 encoded JPG/PNG image under 5MB",
				},
			),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type UpdatePatientInput = z.infer<typeof updatePatientSchema.shape.body>;
export type UpdatePatientParams = z.infer<
	typeof updatePatientSchema.shape.params
>;

// Output type - manually defined for response structure
export interface UpdatePatientOutput {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
	phone: string;
	email?: string;
	patientType: string;
	department?: string;
	status: string;
	updatedAt: string;
}

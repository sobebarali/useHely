import { z } from "zod";

// Blood group enum
const BloodGroup = z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);

// Address sub-schema
const addressSchema = z.object({
	street: z.string().min(1, "Street is required"),
	city: z.string().min(1, "City is required"),
	state: z.string().min(1, "State is required"),
	postalCode: z.string().min(1, "Postal code is required"),
	country: z.string().min(1, "Country is required"),
});

// Emergency contact sub-schema
const emergencyContactSchema = z.object({
	name: z.string().min(1, "Emergency contact name is required"),
	relationship: z.string().min(1, "Relationship is required"),
	phone: z.string().min(1, "Emergency contact phone is required"),
});

// Zod schema for runtime validation
export const registerPatientSchema = z.object({
	body: z.object({
		firstName: z.string().min(1, "First name is required").max(50),
		lastName: z.string().min(1, "Last name is required").max(50),
		dateOfBirth: z.string().datetime({ message: "Invalid date format" }),
		gender: z.enum(["MALE", "FEMALE", "OTHER"]),
		bloodGroup: BloodGroup.optional(),
		phone: z.string().min(1, "Phone number is required"),
		email: z.string().email().optional(),
		address: addressSchema,
		emergencyContact: emergencyContactSchema,
		patientType: z.enum(["OPD", "IPD"]),
		department: z.string().optional(),
		assignedDoctor: z.string().optional(),
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
export type RegisterPatientInput = z.infer<
	typeof registerPatientSchema.shape.body
>;

// Output type - manually defined for response structure
export interface RegisterPatientOutput {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
	dateOfBirth: string;
	gender: string;
	patientType: string;
	status: string;
	createdAt: string;
}

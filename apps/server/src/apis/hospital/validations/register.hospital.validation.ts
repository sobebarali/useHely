import { z } from "zod";

export const registerHospitalSchema = z.object({
	body: z.object({
		name: z.string().min(1, "Hospital name is required"),
		address: z.object({
			street: z.string().min(1, "Street address is required"),
			city: z.string().min(1, "City is required"),
			state: z.string().min(1, "State is required"),
			postalCode: z.string().min(1, "Postal code is required"),
			country: z.string().min(1, "Country is required"),
		}),
		contactEmail: z.string().email("Valid contact email is required"),
		contactPhone: z.string().min(1, "Contact phone is required"),
		licenseNumber: z.string().min(1, "License number is required"),
		adminEmail: z.string().email("Valid admin email is required"),
		adminPhone: z.string().min(1, "Admin phone is required"),
	}),
});

export type RegisterHospitalValidated = z.infer<
	typeof registerHospitalSchema.shape.body
>;

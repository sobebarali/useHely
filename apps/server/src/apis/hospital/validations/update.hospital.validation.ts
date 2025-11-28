import { z } from "zod";

// UUID v4 validation regex
const uuidRegex =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Zod schema for runtime validation
export const updateHospitalSchema = z.object({
	params: z.object({
		id: z
			.string()
			.min(1, "Hospital ID is required")
			.regex(uuidRegex, "Invalid hospital ID format"),
	}),
	body: z
		.object({
			name: z.string().min(1).optional(),
			address: z
				.object({
					street: z.string().min(1).optional(),
					city: z.string().min(1).optional(),
					state: z.string().min(1).optional(),
					postalCode: z.string().min(1).optional(),
					country: z.string().min(1).optional(),
				})
				.optional(),
			contactEmail: z
				.string()
				.email("Valid contact email is required")
				.optional(),
			contactPhone: z.string().min(1).optional(),
			licenseNumber: z.string().optional(),
		})
		.refine((data) => !data.licenseNumber, {
			message: "License number cannot be modified",
			path: ["licenseNumber"],
		}),
});

// Input type - inferred from Zod (single source of truth)
export type UpdateHospitalInput = z.infer<
	typeof updateHospitalSchema.shape.body
>;

// Output type - manually defined for response structure
export interface UpdateHospitalOutput {
	id: string;
	name: string;
	address: {
		street: string;
		city: string;
		state: string;
		postalCode: string;
		country: string;
	};
	contactEmail: string;
	contactPhone: string;
	status: string;
	updatedAt: string;
}

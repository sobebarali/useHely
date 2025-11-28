import { z } from "zod";

// Zod schema for runtime validation
export const verifyHospitalSchema = z.object({
	params: z.object({
		id: z.string().min(1, "Hospital ID is required"),
	}),
	body: z.object({
		token: z.string().min(1, "Verification token is required"),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type VerifyHospitalInput = z.infer<
	typeof verifyHospitalSchema.shape.body
>;

// Output type - manually defined for response structure
export interface VerifyHospitalOutput {
	id: string;
	status: string;
	message: string;
}

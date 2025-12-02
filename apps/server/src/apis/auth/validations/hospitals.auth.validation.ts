import { z } from "zod";

/**
 * Validation schema for GET /api/auth/hospitals
 * Returns hospitals associated with a user's email
 */
export const hospitalsQuerySchema = z.object({
	query: z.object({
		email: z.string().email("Invalid email format"),
	}),
});

export type HospitalsQueryInput = z.infer<
	typeof hospitalsQuerySchema.shape.query
>;

export interface HospitalInfo {
	id: string;
	name: string;
	status: string;
	type: string;
}

export interface HospitalsOutput {
	success: boolean;
	data: HospitalInfo[];
}

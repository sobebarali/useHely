import { z } from "zod";

export const getHospitalByIdSchema = z.object({
	params: z.object({
		id: z.string().min(1, "Hospital ID is required"),
	}),
});

export type GetHospitalByIdValidated = z.infer<
	typeof getHospitalByIdSchema.shape.params
>;

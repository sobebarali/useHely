import { z } from "zod";

// Zod schema for runtime validation
export const getHospitalByIdSchema = z.object({
	params: z.object({
		id: z.string().min(1, "Hospital ID is required"),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type GetHospitalByIdInput = z.infer<
	typeof getHospitalByIdSchema.shape.params
>;

// Output type - manually defined for response structure
export interface GetHospitalByIdOutput {
	id: string;
	tenantId: string;
	name: string;
	type?: string;
	address: {
		street: string;
		city: string;
		state: string;
		postalCode: string;
		country: string;
	};
	contactEmail: string;
	contactPhone: string;
	licenseNumber?: string;
	status: string;
	pricingTier?: string;
	createdAt: string;
	updatedAt: string;
}

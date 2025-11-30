import { z } from "zod";

// Zod schema for runtime validation
export const cancelPrescriptionSchema = z.object({
	params: z.object({
		id: z.string().min(1, "Prescription ID is required"),
	}),
	body: z.object({
		reason: z.string().optional(),
	}),
});

// Input types - inferred from Zod (single source of truth)
export type CancelPrescriptionParams = z.infer<
	typeof cancelPrescriptionSchema.shape.params
>;
export type CancelPrescriptionInput = z.infer<
	typeof cancelPrescriptionSchema.shape.body
>;

// Output type - manually defined for response structure
export interface CancelPrescriptionOutput {
	id: string;
	prescriptionId: string;
	status: string;
	cancelledAt: string;
	cancelledBy: {
		id: string;
		firstName: string;
		lastName: string;
	};
	cancellationReason?: string;
}

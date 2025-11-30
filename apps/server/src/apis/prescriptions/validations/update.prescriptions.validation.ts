import { z } from "zod";

// Medicine sub-schema for updates
const medicineSchema = z.object({
	name: z.string().min(1, "Medicine name is required"),
	dosage: z.string().min(1, "Dosage is required"),
	frequency: z.string().min(1, "Frequency is required"),
	duration: z.string().min(1, "Duration is required"),
	instructions: z.string().optional(),
	route: z.string().optional(),
	quantity: z.number().positive().optional(),
});

// Zod schema for runtime validation
export const updatePrescriptionSchema = z.object({
	params: z.object({
		id: z.string().min(1, "Prescription ID is required"),
	}),
	body: z.object({
		diagnosis: z.string().min(1).optional(),
		notes: z.string().optional(),
		medicines: z.array(medicineSchema).min(1).optional(),
		followUpDate: z.string().datetime().optional(),
	}),
});

// Input types - inferred from Zod (single source of truth)
export type UpdatePrescriptionParams = z.infer<
	typeof updatePrescriptionSchema.shape.params
>;
export type UpdatePrescriptionInput = z.infer<
	typeof updatePrescriptionSchema.shape.body
>;

// Output type - manually defined for response structure
export interface UpdatePrescriptionOutput {
	id: string;
	prescriptionId: string;
	patientId: string;
	doctorId: string;
	diagnosis: string;
	notes?: string;
	medicines: {
		id: string;
		name: string;
		dosage: string;
		frequency: string;
		duration: string;
		instructions?: string;
		route?: string;
		quantity?: number;
	}[];
	status: string;
	followUpDate?: string;
	updatedAt: string;
}

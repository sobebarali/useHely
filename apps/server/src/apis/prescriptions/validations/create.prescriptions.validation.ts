import { z } from "zod";

// Medicine sub-schema
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
export const createPrescriptionSchema = z.object({
	body: z.object({
		patientId: z.string().min(1, "Patient ID is required"),
		diagnosis: z.string().min(1, "Diagnosis is required"),
		notes: z.string().optional(),
		medicines: z
			.array(medicineSchema)
			.min(1, "At least one medicine is required"),
		followUpDate: z.string().datetime().optional(),
		templateId: z.string().optional(),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type CreatePrescriptionInput = z.infer<
	typeof createPrescriptionSchema.shape.body
>;

// Medicine input type
export type MedicineInput = z.infer<typeof medicineSchema>;

// Output type - manually defined for response structure
export interface MedicineOutput {
	id: string;
	name: string;
	dosage: string;
	frequency: string;
	duration: string;
	instructions?: string;
	route?: string;
	quantity?: number;
	dispensed: boolean;
	dispensedQuantity: number;
}

export interface PatientBasicInfo {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
}

export interface DoctorBasicInfo {
	id: string;
	firstName: string;
	lastName: string;
	specialization?: string;
}

export interface CreatePrescriptionOutput {
	id: string;
	prescriptionId: string;
	patientId: string;
	patient: PatientBasicInfo;
	doctorId: string;
	doctor: DoctorBasicInfo;
	diagnosis: string;
	notes?: string;
	medicines: MedicineOutput[];
	status: string;
	createdAt: string;
}

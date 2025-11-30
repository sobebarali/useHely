import { z } from "zod";

// Zod schema for runtime validation
export const getPrescriptionByIdSchema = z.object({
	params: z.object({
		id: z.string().min(1, "Prescription ID is required"),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type GetPrescriptionByIdParams = z.infer<
	typeof getPrescriptionByIdSchema.shape.params
>;

// Medicine output type with full details
export interface FullMedicineOutput {
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

// Patient full details
export interface PatientDetails {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
	dateOfBirth: string;
	gender: string;
	phone: string;
	email?: string;
}

// Doctor full details
export interface DoctorDetails {
	id: string;
	firstName: string;
	lastName: string;
	specialization?: string;
	departmentId?: string;
}

// Pharmacist details
export interface PharmacistDetails {
	id: string;
	firstName: string;
	lastName: string;
}

// Output type - manually defined for response structure
export interface GetPrescriptionByIdOutput {
	id: string;
	prescriptionId: string;
	patient: PatientDetails;
	doctor: DoctorDetails;
	diagnosis: string;
	notes?: string;
	medicines: FullMedicineOutput[];
	status: string;
	followUpDate?: string;
	dispensedBy?: PharmacistDetails;
	dispensedAt?: string;
	createdAt: string;
	updatedAt: string;
}

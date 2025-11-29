import { z } from "zod";

// Zod schema for runtime validation
export const getPatientByIdSchema = z.object({
	params: z.object({
		id: z.string().min(1, "Patient ID is required"),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type GetPatientByIdParams = z.infer<
	typeof getPatientByIdSchema.shape.params
>;

// Address type
export interface AddressOutput {
	street: string;
	city: string;
	state: string;
	postalCode: string;
	country: string;
}

// Emergency contact type
export interface EmergencyContactOutput {
	name: string;
	relationship: string;
	phone: string;
}

// Assigned doctor type
export interface AssignedDoctorOutput {
	id: string;
	firstName: string;
	lastName: string;
	specialization?: string;
}

// Output type - manually defined for response structure
export interface GetPatientOutput {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
	dateOfBirth: string;
	age: number;
	gender: string;
	bloodGroup?: string;
	phone: string;
	email?: string;
	address: AddressOutput;
	emergencyContact: EmergencyContactOutput;
	patientType: string;
	department?: string;
	assignedDoctor?: AssignedDoctorOutput;
	photoUrl?: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}

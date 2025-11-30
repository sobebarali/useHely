import { z } from "zod";
import type {
	DepartmentSummary,
	DoctorSummary,
	PatientSummary,
	TimeSlot,
} from "./create.appointments.validation";

// Zod schema for runtime validation
export const getAppointmentByIdSchema = z.object({
	params: z.object({
		id: z.string().uuid("Invalid appointment ID"),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type GetAppointmentByIdInput = z.infer<
	typeof getAppointmentByIdSchema.shape.params
>;

// Extended patient details for single appointment view
export interface PatientDetails extends PatientSummary {
	phone: string;
	email?: string;
	dateOfBirth: string;
	gender: string;
}

// Extended doctor details for single appointment view
export interface DoctorDetails extends DoctorSummary {
	departmentId: string;
}

// User who cancelled (if applicable)
export interface CancelledByInfo {
	id: string;
	firstName: string;
	lastName: string;
}

// Output type - manually defined for response structure
export interface GetAppointmentByIdOutput {
	id: string;
	appointmentNumber: string;
	patient: PatientDetails;
	doctor: DoctorDetails;
	department: DepartmentSummary;
	date: string;
	timeSlot: TimeSlot;
	type: string;
	reason?: string;
	notes?: string;
	priority: string;
	status: string;
	queueNumber?: number;
	checkedInAt?: string;
	completedAt?: string;
	cancelledAt?: string;
	cancelledBy?: CancelledByInfo;
	cancellationReason?: string;
	createdAt: string;
	updatedAt: string;
}

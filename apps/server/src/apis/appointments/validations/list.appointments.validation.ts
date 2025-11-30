import { z } from "zod";
import type {
	DepartmentSummary,
	DoctorSummary,
	PatientSummary,
	TimeSlot,
} from "./create.appointments.validation";

// Status enum for filtering
const AppointmentStatusEnum = z.enum([
	"SCHEDULED",
	"CONFIRMED",
	"CHECKED_IN",
	"IN_PROGRESS",
	"COMPLETED",
	"CANCELLED",
	"NO_SHOW",
]);

// Type enum for filtering
const AppointmentTypeEnum = z.enum([
	"CONSULTATION",
	"FOLLOW_UP",
	"PROCEDURE",
	"EMERGENCY",
	"ROUTINE_CHECK",
]);

// Zod schema for runtime validation
export const listAppointmentsSchema = z.object({
	query: z.object({
		page: z.coerce.number().int().min(1).default(1),
		limit: z.coerce.number().int().min(1).max(100).default(20),
		patientId: z.string().uuid().optional(),
		doctorId: z.string().uuid().optional(),
		departmentId: z.string().uuid().optional(),
		date: z.string().datetime().optional(),
		startDate: z.string().datetime().optional(),
		endDate: z.string().datetime().optional(),
		status: AppointmentStatusEnum.optional(),
		type: AppointmentTypeEnum.optional(),
		sortBy: z.enum(["date", "createdAt", "status"]).default("date"),
		sortOrder: z.enum(["asc", "desc"]).default("asc"),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type ListAppointmentsInput = z.infer<
	typeof listAppointmentsSchema.shape.query
>;

// Appointment item in list
export interface AppointmentListItem {
	id: string;
	appointmentNumber: string;
	patient: PatientSummary;
	doctor: DoctorSummary;
	department: DepartmentSummary;
	date: string;
	timeSlot: TimeSlot;
	type: string;
	status: string;
	priority: string;
	queueNumber?: number;
	createdAt: string;
}

// Pagination info
export interface PaginationInfo {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

// Output type - manually defined for response structure
export interface ListAppointmentsOutput {
	data: AppointmentListItem[];
	pagination: PaginationInfo;
}

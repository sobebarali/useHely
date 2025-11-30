import { z } from "zod";

// Appointment type enum
const AppointmentTypeEnum = z.enum([
	"CONSULTATION",
	"FOLLOW_UP",
	"PROCEDURE",
	"EMERGENCY",
	"ROUTINE_CHECK",
]);

// Priority enum
const PriorityEnum = z.enum(["NORMAL", "URGENT", "EMERGENCY"]);

// Zod schema for runtime validation
export const createAppointmentSchema = z.object({
	body: z
		.object({
			patientId: z.string().uuid("Invalid patient ID"),
			doctorId: z.string().uuid("Invalid doctor ID"),
			departmentId: z.string().uuid("Invalid department ID"),
			date: z.string().datetime({ message: "Invalid date format" }),
			timeSlot: z.object({
				start: z
					.string()
					.regex(
						/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
						"Invalid time format (HH:mm)",
					),
				end: z
					.string()
					.regex(
						/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
						"Invalid time format (HH:mm)",
					),
			}),
			type: AppointmentTypeEnum,
			reason: z.string().max(500).optional(),
			notes: z.string().max(1000).optional(),
			priority: PriorityEnum.default("NORMAL"),
		})
		.refine(
			(data) => {
				const startParts = data.timeSlot.start.split(":");
				const endParts = data.timeSlot.end.split(":");
				const startMinutes = Number(startParts[0]) * 60 + Number(startParts[1]);
				const endMinutes = Number(endParts[0]) * 60 + Number(endParts[1]);
				return endMinutes > startMinutes;
			},
			{
				message: "End time must be after start time",
				path: ["timeSlot", "end"],
			},
		),
});

// Input type - inferred from Zod (single source of truth)
export type CreateAppointmentInput = z.infer<
	typeof createAppointmentSchema.shape.body
>;

// Time slot type
export interface TimeSlot {
	start: string;
	end: string;
}

// Patient summary for response
export interface PatientSummary {
	id: string;
	patientId: string;
	firstName: string;
	lastName: string;
}

// Doctor summary for response
export interface DoctorSummary {
	id: string;
	employeeId: string;
	firstName: string;
	lastName: string;
	specialization?: string;
}

// Department summary for response
export interface DepartmentSummary {
	id: string;
	name: string;
	code: string;
}

// Output type - manually defined for response structure
export interface CreateAppointmentOutput {
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
	reason?: string;
	notes?: string;
	queueNumber?: number;
	createdAt: string;
}

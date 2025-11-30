import { z } from "zod";
import type {
	DepartmentSummary,
	DoctorSummary,
	PatientSummary,
	TimeSlot,
} from "./create.appointments.validation";

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
export const updateAppointmentSchema = z.object({
	params: z.object({
		id: z.string().uuid("Invalid appointment ID"),
	}),
	body: z
		.object({
			doctorId: z.string().uuid("Invalid doctor ID").optional(),
			date: z.string().datetime({ message: "Invalid date format" }).optional(),
			timeSlot: z
				.object({
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
				})
				.optional(),
			type: AppointmentTypeEnum.optional(),
			reason: z.string().max(500).optional(),
			notes: z.string().max(1000).optional(),
			priority: PriorityEnum.optional(),
		})
		.refine(
			(data) => {
				// Only validate if timeSlot is provided
				if (!data.timeSlot) return true;
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
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

// Output type - manually defined for response structure
export interface UpdateAppointmentOutput {
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
	updatedAt: string;
}

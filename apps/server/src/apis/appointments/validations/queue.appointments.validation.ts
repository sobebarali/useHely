import { z } from "zod";
import type { PatientSummary } from "./create.appointments.validation";

// Zod schema for runtime validation
export const getQueueSchema = z.object({
	query: z.object({
		doctorId: z.string().uuid().optional(),
		departmentId: z.string().uuid().optional(),
		date: z.string().datetime().optional(),
	}),
});

// Input type - inferred from Zod (single source of truth)
export type GetQueueInput = z.infer<typeof getQueueSchema.shape.query>;

// Appointment summary for queue
export interface QueueAppointmentSummary {
	id: string;
	appointmentNumber: string;
	type: string;
	priority: string;
}

// Queue item
export interface QueueItem {
	queueNumber: number;
	appointment: QueueAppointmentSummary;
	patient: PatientSummary;
	checkedInAt: string;
	estimatedTime: string;
	status: string;
}

// Output type - manually defined for response structure
export interface GetQueueOutput {
	queue: QueueItem[];
	currentNumber: number;
	totalWaiting: number;
}

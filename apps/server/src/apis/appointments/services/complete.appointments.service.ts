import { AppointmentStatus } from "@hms/db";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
} from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { completeAppointment } from "../repositories/complete.appointments.repository";
import { findAppointmentById } from "../repositories/shared.appointments.repository";
import type { CompleteAppointmentOutput } from "../validations/complete.appointments.validation";

const logger = createServiceLogger("completeAppointment");

/**
 * Complete an appointment
 */
export async function completeAppointmentService({
	tenantId,
	appointmentId,
	staffId,
	notes,
	followUpRequired,
	followUpDate,
}: {
	tenantId: string;
	appointmentId: string;
	staffId: string;
	notes?: string;
	followUpRequired?: boolean;
	followUpDate?: string;
}): Promise<CompleteAppointmentOutput> {
	logger.info({ tenantId, appointmentId, staffId }, "Completing appointment");

	// Verify appointment exists
	const existingAppointment = await findAppointmentById({
		tenantId,
		appointmentId,
	});

	if (!existingAppointment) {
		throw new NotFoundError("Appointment not found", "NOT_FOUND");
	}

	// Verify the staff completing is the assigned doctor
	if (existingAppointment.doctorId !== staffId) {
		throw new ForbiddenError(
			"Only the assigned doctor can complete this appointment",
			"FORBIDDEN",
		);
	}

	// Check if patient is checked in
	if (
		existingAppointment.status !== AppointmentStatus.CHECKED_IN &&
		existingAppointment.status !== AppointmentStatus.IN_PROGRESS
	) {
		throw new BadRequestError(
			"Patient must be checked in before completing the appointment",
			"NOT_CHECKED_IN",
		);
	}

	// Complete appointment
	const appointment = await completeAppointment({
		tenantId,
		appointmentId,
		notes,
		followUpRequired,
		followUpDate,
	});

	if (!appointment) {
		throw new NotFoundError("Appointment not found", "NOT_FOUND");
	}

	logger.info({ appointmentId }, "Appointment completed successfully");

	return {
		id: String(appointment._id),
		status: appointment.status,
		completedAt:
			appointment.completedAt?.toISOString() || new Date().toISOString(),
		notes: appointment.notes ?? undefined,
		followUpRequired: appointment.followUpRequired ?? undefined,
		followUpDate: appointment.followUpDate?.toISOString() ?? undefined,
	};
}

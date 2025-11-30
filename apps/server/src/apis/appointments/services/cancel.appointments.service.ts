import { AppointmentStatus } from "@hms/db";
import { BadRequestError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { findStaffById } from "../../users/repositories/shared.users.repository";
import { cancelAppointment } from "../repositories/cancel.appointments.repository";
import { findAppointmentById } from "../repositories/shared.appointments.repository";
import type { CancelAppointmentOutput } from "../validations/cancel.appointments.validation";

const logger = createServiceLogger("cancelAppointment");

/**
 * Cancel an appointment
 */
export async function cancelAppointmentService({
	tenantId,
	appointmentId,
	staffId,
	reason,
}: {
	tenantId: string;
	appointmentId: string;
	staffId: string;
	reason?: string;
}): Promise<CancelAppointmentOutput> {
	logger.info({ tenantId, appointmentId, staffId }, "Cancelling appointment");

	// Verify appointment exists
	const existingAppointment = await findAppointmentById({
		tenantId,
		appointmentId,
	});

	if (!existingAppointment) {
		throw new NotFoundError("Appointment not found", "NOT_FOUND");
	}

	// Cannot cancel completed appointments
	if (existingAppointment.status === AppointmentStatus.COMPLETED) {
		throw new BadRequestError(
			"Cannot cancel a completed appointment",
			"ALREADY_COMPLETED",
		);
	}

	// Cannot cancel already cancelled appointments
	if (existingAppointment.status === AppointmentStatus.CANCELLED) {
		throw new BadRequestError(
			"Appointment is already cancelled",
			"ALREADY_CANCELLED",
		);
	}

	// Cancel appointment
	const appointment = await cancelAppointment({
		tenantId,
		appointmentId,
		cancelledBy: staffId,
		cancellationReason: reason,
	});

	if (!appointment) {
		throw new NotFoundError("Appointment not found", "NOT_FOUND");
	}

	// Get staff details for response
	const staff = await findStaffById({ tenantId, staffId });

	logger.info({ appointmentId }, "Appointment cancelled successfully");

	return {
		id: String(appointment._id),
		status: appointment.status,
		cancelledAt:
			appointment.cancelledAt?.toISOString() || new Date().toISOString(),
		cancelledBy: {
			id: staffId,
			firstName: staff?.firstName || "",
			lastName: staff?.lastName || "",
		},
		cancellationReason: appointment.cancellationReason ?? undefined,
	};
}

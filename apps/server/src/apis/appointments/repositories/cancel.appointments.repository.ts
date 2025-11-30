import { Appointment, AppointmentStatus } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("cancelAppointment");

/**
 * Cancel an appointment
 */
export async function cancelAppointment({
	tenantId,
	appointmentId,
	cancelledBy,
	cancellationReason,
}: {
	tenantId: string;
	appointmentId: string;
	cancelledBy: string;
	cancellationReason?: string;
}) {
	try {
		logger.debug(
			{ tenantId, appointmentId, cancelledBy },
			"Cancelling appointment",
		);

		const appointment = await Appointment.findOneAndUpdate(
			{ _id: appointmentId, tenantId },
			{
				$set: {
					status: AppointmentStatus.CANCELLED,
					cancelledAt: new Date(),
					cancelledBy,
					cancellationReason,
					updatedAt: new Date(),
				},
			},
			{ new: true },
		).lean();

		logDatabaseOperation(
			logger,
			"findOneAndUpdate",
			"appointment",
			{ tenantId, appointmentId },
			appointment
				? { _id: appointment._id, cancelled: true }
				: { cancelled: false },
		);

		return appointment;
	} catch (error) {
		logError(logger, error, "Failed to cancel appointment", {
			tenantId,
			appointmentId,
		});
		throw error;
	}
}

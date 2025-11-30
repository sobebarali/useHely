import { Appointment, AppointmentStatus } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("checkInAppointment");

/**
 * Check in a patient for their appointment
 */
export async function checkInAppointment({
	tenantId,
	appointmentId,
	queueNumber,
}: {
	tenantId: string;
	appointmentId: string;
	queueNumber: number;
}) {
	try {
		logger.debug(
			{ tenantId, appointmentId, queueNumber },
			"Checking in patient for appointment",
		);

		const appointment = await Appointment.findOneAndUpdate(
			{ _id: appointmentId, tenantId },
			{
				$set: {
					status: AppointmentStatus.CHECKED_IN,
					checkedInAt: new Date(),
					queueNumber,
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
				? { _id: appointment._id, checkedIn: true }
				: { checkedIn: false },
		);

		return appointment;
	} catch (error) {
		logError(logger, error, "Failed to check in appointment", {
			tenantId,
			appointmentId,
		});
		throw error;
	}
}

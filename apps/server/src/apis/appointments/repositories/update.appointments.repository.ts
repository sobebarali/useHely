import { Appointment } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("updateAppointment");

/**
 * Update appointment details
 */
export async function updateAppointment({
	tenantId,
	appointmentId,
	data,
}: {
	tenantId: string;
	appointmentId: string;
	data: {
		doctorId?: string;
		date?: Date;
		timeSlot?: { start: string; end: string };
		type?: string;
		reason?: string;
		notes?: string;
		priority?: string;
		queueNumber?: number;
	};
}) {
	try {
		logger.debug({ tenantId, appointmentId }, "Updating appointment");

		const appointment = await Appointment.findOneAndUpdate(
			{ _id: appointmentId, tenantId },
			{
				$set: {
					...data,
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
				? { _id: appointment._id, updated: true }
				: { updated: false },
		);

		return appointment;
	} catch (error) {
		logError(logger, error, "Failed to update appointment", {
			tenantId,
			appointmentId,
		});
		throw error;
	}
}

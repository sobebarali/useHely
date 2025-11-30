import { Appointment, AppointmentStatus } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("completeAppointment");

/**
 * Complete an appointment
 */
export async function completeAppointment({
	tenantId,
	appointmentId,
	notes,
	followUpRequired,
	followUpDate,
}: {
	tenantId: string;
	appointmentId: string;
	notes?: string;
	followUpRequired?: boolean;
	followUpDate?: string;
}) {
	try {
		logger.debug({ tenantId, appointmentId }, "Completing appointment");

		const updateData: Record<string, unknown> = {
			status: AppointmentStatus.COMPLETED,
			completedAt: new Date(),
			updatedAt: new Date(),
		};

		if (notes !== undefined) {
			updateData.notes = notes;
		}

		if (followUpRequired !== undefined) {
			updateData.followUpRequired = followUpRequired;
		}

		if (followUpDate) {
			updateData.followUpDate = new Date(followUpDate);
		}

		const appointment = await Appointment.findOneAndUpdate(
			{ _id: appointmentId, tenantId },
			{ $set: updateData },
			{ new: true },
		).lean();

		logDatabaseOperation(
			logger,
			"findOneAndUpdate",
			"appointment",
			{ tenantId, appointmentId },
			appointment
				? { _id: appointment._id, completed: true }
				: { completed: false },
		);

		return appointment;
	} catch (error) {
		logError(logger, error, "Failed to complete appointment", {
			tenantId,
			appointmentId,
		});
		throw error;
	}
}

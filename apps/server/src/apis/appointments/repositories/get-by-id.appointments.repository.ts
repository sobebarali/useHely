import { Appointment } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("getAppointmentById");

/**
 * Get appointment by ID with full details
 */
export async function getAppointmentById({
	tenantId,
	appointmentId,
}: {
	tenantId: string;
	appointmentId: string;
}) {
	try {
		logger.debug({ tenantId, appointmentId }, "Getting appointment by ID");

		const appointment = await Appointment.findOne({
			_id: appointmentId,
			tenantId,
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"appointment",
			{ tenantId, appointmentId },
			appointment ? { _id: appointment._id, found: true } : { found: false },
		);

		return appointment;
	} catch (error) {
		logError(logger, error, "Failed to get appointment by ID", {
			tenantId,
			appointmentId,
		});
		throw error;
	}
}

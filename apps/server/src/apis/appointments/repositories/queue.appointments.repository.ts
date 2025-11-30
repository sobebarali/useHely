import { Appointment, AppointmentStatus } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { GetQueueInput } from "../validations/queue.appointments.validation";

const logger = createRepositoryLogger("queueAppointments");

/**
 * Get queue for appointments (checked-in patients waiting)
 */
export async function getQueue({
	tenantId,
	doctorId,
	departmentId,
	date,
}: {
	tenantId: string;
} & GetQueueInput) {
	try {
		// Default to today if no date provided
		const targetDate = date ? new Date(date) : new Date();
		const startOfDay = new Date(targetDate);
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date(targetDate);
		endOfDay.setHours(23, 59, 59, 999);

		logger.debug({ tenantId, doctorId, departmentId, date }, "Getting queue");

		const query: Record<string, unknown> = {
			tenantId,
			date: { $gte: startOfDay, $lte: endOfDay },
			status: {
				$in: [
					AppointmentStatus.CHECKED_IN,
					AppointmentStatus.IN_PROGRESS,
					AppointmentStatus.COMPLETED,
				],
			},
		};

		if (doctorId) {
			query.doctorId = doctorId;
		}
		if (departmentId) {
			query.departmentId = departmentId;
		}

		const appointments = await Appointment.find(query)
			.sort({ queueNumber: 1 })
			.lean();

		// Separate into waiting and completed
		const waiting = appointments.filter(
			(apt) =>
				apt.status === AppointmentStatus.CHECKED_IN ||
				apt.status === AppointmentStatus.IN_PROGRESS,
		);
		const currentInProgress = appointments.find(
			(apt) => apt.status === AppointmentStatus.IN_PROGRESS,
		);

		logDatabaseOperation(
			logger,
			"find",
			"appointment",
			{ tenantId, doctorId, departmentId },
			{ total: appointments.length, waiting: waiting.length },
		);

		return {
			appointments: waiting,
			currentNumber: currentInProgress?.queueNumber || 0,
			totalWaiting: waiting.filter(
				(apt) => apt.status === AppointmentStatus.CHECKED_IN,
			).length,
		};
	} catch (error) {
		logError(logger, error, "Failed to get queue", { tenantId });
		throw error;
	}
}

/**
 * Start an appointment (change status to IN_PROGRESS)
 */
export async function startAppointment({
	tenantId,
	appointmentId,
}: {
	tenantId: string;
	appointmentId: string;
}) {
	try {
		logger.debug({ tenantId, appointmentId }, "Starting appointment");

		const appointment = await Appointment.findOneAndUpdate(
			{
				_id: appointmentId,
				tenantId,
				status: AppointmentStatus.CHECKED_IN,
			},
			{
				$set: {
					status: AppointmentStatus.IN_PROGRESS,
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
				? { _id: appointment._id, started: true }
				: { started: false },
		);

		return appointment;
	} catch (error) {
		logError(logger, error, "Failed to start appointment", {
			tenantId,
			appointmentId,
		});
		throw error;
	}
}

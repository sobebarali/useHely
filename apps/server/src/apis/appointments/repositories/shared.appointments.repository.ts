import { Appointment, AppointmentStatus, Counter } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("sharedAppointments");

/**
 * Find appointment by ID within a tenant
 */
export async function findAppointmentById({
	tenantId,
	appointmentId,
}: {
	tenantId: string;
	appointmentId: string;
}) {
	try {
		logger.debug({ tenantId, appointmentId }, "Finding appointment by ID");

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
		logError(logger, error, "Failed to find appointment by ID");
		throw error;
	}
}

/**
 * Find appointments by patient, doctor, and date (for duplicate check)
 */
export async function findDuplicateAppointment({
	tenantId,
	patientId,
	doctorId,
	date,
}: {
	tenantId: string;
	patientId: string;
	doctorId: string;
	date: Date;
}) {
	try {
		const startOfDay = new Date(date);
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date(date);
		endOfDay.setHours(23, 59, 59, 999);

		logger.debug(
			{ tenantId, patientId, doctorId, date },
			"Checking for duplicate appointment",
		);

		const appointment = await Appointment.findOne({
			tenantId,
			patientId,
			doctorId,
			date: { $gte: startOfDay, $lte: endOfDay },
			status: {
				$nin: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
			},
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"appointment",
			{ tenantId, patientId, doctorId },
			appointment ? { _id: appointment._id, found: true } : { found: false },
		);

		return appointment;
	} catch (error) {
		logError(logger, error, "Failed to check for duplicate appointment");
		throw error;
	}
}

/**
 * Check if a time slot is available for a doctor on a specific date
 */
export async function isSlotAvailable({
	tenantId,
	doctorId,
	date,
	timeSlot,
	excludeAppointmentId,
}: {
	tenantId: string;
	doctorId: string;
	date: Date;
	timeSlot: { start: string; end: string };
	excludeAppointmentId?: string;
}) {
	try {
		const startOfDay = new Date(date);
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date(date);
		endOfDay.setHours(23, 59, 59, 999);

		logger.debug(
			{ tenantId, doctorId, date, timeSlot },
			"Checking slot availability",
		);

		const query: Record<string, unknown> = {
			tenantId,
			doctorId,
			date: { $gte: startOfDay, $lte: endOfDay },
			status: {
				$nin: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
			},
			$or: [
				{
					"timeSlot.start": { $lt: timeSlot.end },
					"timeSlot.end": { $gt: timeSlot.start },
				},
			],
		};

		if (excludeAppointmentId) {
			query._id = { $ne: excludeAppointmentId };
		}

		const existingAppointment = await Appointment.findOne(query).lean();

		const isAvailable = !existingAppointment;

		logDatabaseOperation(
			logger,
			"findOne",
			"appointment",
			{ tenantId, doctorId, timeSlot },
			{ available: isAvailable },
		);

		return isAvailable;
	} catch (error) {
		logError(logger, error, "Failed to check slot availability");
		throw error;
	}
}

/**
 * Generate next appointment number for a tenant
 * Format: {tenantId}-APT-{sequential}
 */
export async function generateAppointmentNumber({
	tenantId,
}: {
	tenantId: string;
}): Promise<string> {
	try {
		logger.debug({ tenantId }, "Generating appointment number");

		const counter = await Counter.findOneAndUpdate(
			{ tenantId, type: "appointment" },
			{ $inc: { seq: 1 } },
			{ new: true, upsert: true },
		);

		const seq = counter?.seq || 1;
		const appointmentNumber = `${tenantId}-APT-${String(seq).padStart(6, "0")}`;

		logDatabaseOperation(
			logger,
			"generateId",
			"counter",
			{ tenantId, type: "appointment" },
			{ appointmentNumber, seq },
		);

		return appointmentNumber;
	} catch (error) {
		logError(logger, error, "Failed to generate appointment number");
		throw error;
	}
}

/**
 * Get next queue number for a doctor on a specific date (atomic operation)
 * Uses Counter collection to prevent race conditions
 */
export async function getNextQueueNumber({
	tenantId,
	doctorId,
	date,
}: {
	tenantId: string;
	doctorId: string;
	date: Date;
}): Promise<number> {
	try {
		// Create a unique key for this doctor's queue on this date
		const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
		const counterKey = `queue-${doctorId}-${dateStr}`;

		logger.debug(
			{ tenantId, doctorId, date, counterKey },
			"Getting next queue number (atomic)",
		);

		// Atomic increment using Counter collection
		const counter = await Counter.findOneAndUpdate(
			{ tenantId, type: counterKey },
			{ $inc: { seq: 1 } },
			{ new: true, upsert: true },
		);

		const queueNumber = counter?.seq || 1;

		logDatabaseOperation(
			logger,
			"findOneAndUpdate",
			"counter",
			{ tenantId, type: counterKey },
			{ queueNumber },
		);

		return queueNumber;
	} catch (error) {
		logError(logger, error, "Failed to get next queue number");
		throw error;
	}
}

/**
 * Count appointments by doctor for a specific date
 */
export async function countAppointmentsByDoctor({
	tenantId,
	doctorId,
	date,
	status,
}: {
	tenantId: string;
	doctorId: string;
	date: Date;
	status?: string[];
}) {
	try {
		const startOfDay = new Date(date);
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date(date);
		endOfDay.setHours(23, 59, 59, 999);

		const query: Record<string, unknown> = {
			tenantId,
			doctorId,
			date: { $gte: startOfDay, $lte: endOfDay },
		};

		if (status) {
			query.status = { $in: status };
		}

		const count = await Appointment.countDocuments(query);

		logDatabaseOperation(
			logger,
			"count",
			"appointment",
			{ tenantId, doctorId, date },
			{ count },
		);

		return count;
	} catch (error) {
		logError(logger, error, "Failed to count appointments by doctor");
		throw error;
	}
}

/**
 * Get doctor's appointments for a specific date
 */
export async function getDoctorAppointmentsForDate({
	tenantId,
	doctorId,
	date,
}: {
	tenantId: string;
	doctorId: string;
	date: Date;
}) {
	try {
		const startOfDay = new Date(date);
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date(date);
		endOfDay.setHours(23, 59, 59, 999);

		logger.debug(
			{ tenantId, doctorId, date },
			"Getting doctor appointments for date",
		);

		const appointments = await Appointment.find({
			tenantId,
			doctorId,
			date: { $gte: startOfDay, $lte: endOfDay },
			status: {
				$nin: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
			},
		})
			.select("timeSlot")
			.lean();

		logDatabaseOperation(
			logger,
			"find",
			"appointment",
			{ tenantId, doctorId, date },
			{ count: appointments.length },
		);

		return appointments;
	} catch (error) {
		logError(logger, error, "Failed to get doctor appointments for date");
		throw error;
	}
}

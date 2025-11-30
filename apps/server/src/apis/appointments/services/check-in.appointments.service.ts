import { AppointmentStatus } from "@hms/db";
import { BadRequestError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { checkInAppointment } from "../repositories/check-in.appointments.repository";
import {
	countAppointmentsByDoctor,
	findAppointmentById,
	getNextQueueNumber,
} from "../repositories/shared.appointments.repository";
import type { CheckInAppointmentOutput } from "../validations/check-in.appointments.validation";

const logger = createServiceLogger("checkInAppointment");

// Estimated minutes per appointment for wait time calculation
const MINUTES_PER_APPOINTMENT = 15;

/**
 * Check in a patient for their appointment
 */
export async function checkInAppointmentService({
	tenantId,
	appointmentId,
}: {
	tenantId: string;
	appointmentId: string;
}): Promise<CheckInAppointmentOutput> {
	logger.info({ tenantId, appointmentId }, "Checking in patient");

	// Verify appointment exists
	const existingAppointment = await findAppointmentById({
		tenantId,
		appointmentId,
	});

	if (!existingAppointment) {
		throw new NotFoundError("Appointment not found", "NOT_FOUND");
	}

	// Validate appointment is for today
	const appointmentDate = new Date(existingAppointment.date);
	const today = new Date();
	const appointmentDateStr = appointmentDate.toDateString();
	const todayStr = today.toDateString();

	if (appointmentDateStr !== todayStr) {
		if (appointmentDate < today) {
			throw new BadRequestError(
				"Cannot check in for a past appointment",
				"APPOINTMENT_IN_PAST",
			);
		}
		throw new BadRequestError(
			"Cannot check in for a future appointment",
			"APPOINTMENT_IN_FUTURE",
		);
	}

	// Check if already checked in
	if (existingAppointment.status === AppointmentStatus.CHECKED_IN) {
		throw new BadRequestError(
			"Patient is already checked in",
			"ALREADY_CHECKED_IN",
		);
	}

	// Check if appointment can be checked in
	if (
		existingAppointment.status === AppointmentStatus.COMPLETED ||
		existingAppointment.status === AppointmentStatus.CANCELLED ||
		existingAppointment.status === AppointmentStatus.NO_SHOW
	) {
		throw new BadRequestError(
			"Cannot check in for this appointment",
			"INVALID_STATUS",
		);
	}

	// Get queue number
	const queueNumber =
		existingAppointment.queueNumber ||
		(await getNextQueueNumber({
			tenantId,
			doctorId: existingAppointment.doctorId,
			date: today,
		}));

	// Check in appointment
	const appointment = await checkInAppointment({
		tenantId,
		appointmentId,
		queueNumber,
	});

	if (!appointment) {
		throw new NotFoundError("Appointment not found", "NOT_FOUND");
	}

	// Calculate estimated wait time
	const waitingCount = await countAppointmentsByDoctor({
		tenantId,
		doctorId: existingAppointment.doctorId,
		date: today,
		status: [AppointmentStatus.CHECKED_IN],
	});

	// Subtract 1 because we just checked in
	const patientsAhead = Math.max(0, waitingCount - 1);
	const estimatedWait = patientsAhead * MINUTES_PER_APPOINTMENT;

	logger.info(
		{ appointmentId, queueNumber, estimatedWait },
		"Patient checked in successfully",
	);

	return {
		id: String(appointment._id),
		status: appointment.status,
		queueNumber: appointment.queueNumber || queueNumber,
		checkedInAt:
			appointment.checkedInAt?.toISOString() || new Date().toISOString(),
		estimatedWait,
	};
}

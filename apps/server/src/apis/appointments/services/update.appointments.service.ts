import { AppointmentStatus } from "@hms/db";
import { BadRequestError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { findPatientById } from "../../patients/repositories/shared.patients.repository";
import {
	findDepartmentById,
	findStaffById,
} from "../../users/repositories/shared.users.repository";
import {
	findAppointmentById,
	getNextQueueNumber,
	isSlotAvailable,
} from "../repositories/shared.appointments.repository";
import { updateAppointment } from "../repositories/update.appointments.repository";
import type {
	UpdateAppointmentInput,
	UpdateAppointmentOutput,
} from "../validations/update.appointments.validation";

const logger = createServiceLogger("updateAppointment");

/**
 * Update appointment details
 */
export async function updateAppointmentService({
	tenantId,
	appointmentId,
	doctorId,
	date,
	timeSlot,
	type,
	reason,
	notes,
	priority,
}: {
	tenantId: string;
	appointmentId: string;
} & UpdateAppointmentInput["body"]): Promise<UpdateAppointmentOutput> {
	logger.info({ tenantId, appointmentId }, "Updating appointment");

	// Verify appointment exists
	const existingAppointment = await findAppointmentById({
		tenantId,
		appointmentId,
	});

	if (!existingAppointment) {
		throw new NotFoundError("Appointment not found", "NOT_FOUND");
	}

	// Cannot modify completed or cancelled appointments
	if (
		existingAppointment.status === AppointmentStatus.COMPLETED ||
		existingAppointment.status === AppointmentStatus.CANCELLED
	) {
		throw new BadRequestError(
			"Cannot modify completed or cancelled appointments",
			"CANNOT_RESCHEDULE",
		);
	}

	// Build update data
	const updateData: Record<string, unknown> = {};

	if (doctorId) {
		// Validate new doctor exists
		const doctorCheck = await findStaffById({ tenantId, staffId: doctorId });
		if (!doctorCheck) {
			throw new NotFoundError("Doctor not found", "INVALID_DOCTOR");
		}
		updateData.doctorId = doctorId;
	}

	if (date) {
		const newDate = new Date(date);
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (newDate < today) {
			throw new BadRequestError(
				"Cannot reschedule to a past date",
				"INVALID_DATE",
			);
		}
		updateData.date = newDate;
	}

	if (timeSlot) {
		// Check slot availability for new time
		const checkDate = date ? new Date(date) : existingAppointment.date;
		const checkDoctorId = doctorId || existingAppointment.doctorId;

		const slotAvailable = await isSlotAvailable({
			tenantId,
			doctorId: checkDoctorId,
			date: checkDate,
			timeSlot,
			excludeAppointmentId: appointmentId,
		});

		if (!slotAvailable) {
			throw new BadRequestError(
				"Time slot is not available",
				"SLOT_UNAVAILABLE",
			);
		}
		updateData.timeSlot = timeSlot;
	}

	if (type) updateData.type = type;
	if (reason !== undefined) updateData.reason = reason;
	if (notes !== undefined) updateData.notes = notes;
	if (priority) updateData.priority = priority;

	// If doctor changed, reset queue number
	if (doctorId && doctorId !== existingAppointment.doctorId) {
		const appointmentDate = date ? new Date(date) : existingAppointment.date;
		const isToday =
			appointmentDate.toDateString() === new Date().toDateString();
		if (isToday) {
			updateData.queueNumber = await getNextQueueNumber({
				tenantId,
				doctorId,
				date: appointmentDate,
			});
		}
	}

	// Update appointment
	const appointment = await updateAppointment({
		tenantId,
		appointmentId,
		data: updateData,
	});

	if (!appointment) {
		throw new NotFoundError("Appointment not found", "NOT_FOUND");
	}

	// Fetch related entities for response
	const [patient, doctor, department] = await Promise.all([
		findPatientById({ tenantId, patientId: appointment.patientId }),
		findStaffById({ tenantId, staffId: appointment.doctorId }),
		findDepartmentById({ tenantId, departmentId: appointment.departmentId }),
	]);

	logger.info({ appointmentId }, "Appointment updated successfully");

	return {
		id: String(appointment._id),
		appointmentNumber: appointment.appointmentNumber,
		patient: {
			id: appointment.patientId,
			patientId: patient?.patientId || "",
			firstName: patient?.firstName || "",
			lastName: patient?.lastName || "",
		},
		doctor: {
			id: appointment.doctorId,
			employeeId: doctor?.employeeId || "",
			firstName: doctor?.firstName || "",
			lastName: doctor?.lastName || "",
			specialization: doctor?.specialization ?? undefined,
		},
		department: {
			id: appointment.departmentId,
			name: department?.name || "",
			code: department?.code || "",
		},
		date: appointment.date.toISOString(),
		timeSlot: appointment.timeSlot,
		type: appointment.type,
		status: appointment.status,
		priority: appointment.priority,
		reason: appointment.reason ?? undefined,
		notes: appointment.notes ?? undefined,
		queueNumber: appointment.queueNumber ?? undefined,
		updatedAt: appointment.updatedAt.toISOString(),
	};
}

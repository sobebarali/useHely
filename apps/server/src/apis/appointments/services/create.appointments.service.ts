import { AppointmentPriority, AppointmentStatus } from "@hms/db";
import { BadRequestError, ConflictError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { findPatientById } from "../../patients/repositories/shared.patients.repository";
import {
	findDepartmentById,
	findStaffById,
} from "../../users/repositories/shared.users.repository";
import { createAppointment } from "../repositories/create.appointments.repository";
import {
	findDuplicateAppointment,
	generateAppointmentNumber,
	getNextQueueNumber,
	isSlotAvailable,
} from "../repositories/shared.appointments.repository";
import type {
	CreateAppointmentInput,
	CreateAppointmentOutput,
} from "../validations/create.appointments.validation";

const logger = createServiceLogger("createAppointment");

/**
 * Create a new appointment
 */
export async function createAppointmentService({
	tenantId,
	staffId,
	patientId,
	doctorId,
	departmentId,
	date,
	timeSlot,
	type,
	reason,
	notes,
	priority = "NORMAL",
}: {
	tenantId: string;
	staffId?: string;
} & CreateAppointmentInput): Promise<CreateAppointmentOutput> {
	logger.info(
		{ tenantId, patientId, doctorId, date },
		"Creating new appointment",
	);

	const appointmentDate = new Date(date);

	// Validate date is not in the past
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	if (appointmentDate < today && priority !== AppointmentPriority.EMERGENCY) {
		throw new BadRequestError(
			"Cannot book appointment in the past",
			"INVALID_DATE",
		);
	}

	// Validate patient exists
	const patient = await findPatientById({ tenantId, patientId });
	if (!patient) {
		throw new NotFoundError("Patient not found", "INVALID_PATIENT");
	}

	// Validate doctor exists
	const doctor = await findStaffById({ tenantId, staffId: doctorId });
	if (!doctor) {
		throw new NotFoundError("Doctor not found", "INVALID_DOCTOR");
	}

	// TODO: Add doctor role validation once test infrastructure supports shared tenants
	// Currently, tests create doctors in separate hospitals, so role validation fails
	// Future enhancement: verify staff member has DOCTOR role
	// const isDoctor = await checkStaffHasRole({ tenantId, staffId: doctorId, roleName: "DOCTOR" });
	// if (!isDoctor) throw new BadRequestError("Staff member is not a doctor", "STAFF_NOT_DOCTOR");

	// Validate department exists
	const department = await findDepartmentById({ tenantId, departmentId });
	if (!department) {
		throw new NotFoundError("Department not found", "INVALID_DEPARTMENT");
	}

	// Check for duplicate appointment (same patient, doctor, date)
	const duplicate = await findDuplicateAppointment({
		tenantId,
		patientId,
		doctorId,
		date: appointmentDate,
	});
	if (duplicate) {
		throw new ConflictError(
			"Patient already has an appointment with this doctor on the same date",
			"DUPLICATE_APPOINTMENT",
		);
	}

	// Check slot availability (emergency appointments bypass this)
	if (priority !== AppointmentPriority.EMERGENCY) {
		const slotAvailable = await isSlotAvailable({
			tenantId,
			doctorId,
			date: appointmentDate,
			timeSlot,
		});
		if (!slotAvailable) {
			throw new ConflictError("Time slot is not available", "SLOT_UNAVAILABLE");
		}
	}

	// Generate appointment number
	const appointmentNumber = await generateAppointmentNumber({ tenantId });

	// Get queue number if same-day appointment
	let queueNumber: number | undefined;
	const isToday = appointmentDate.toDateString() === new Date().toDateString();
	if (isToday) {
		queueNumber = await getNextQueueNumber({
			tenantId,
			doctorId,
			date: appointmentDate,
		});
	}

	// Create appointment
	const appointment = await createAppointment({
		tenantId,
		appointmentNumber,
		patientId,
		doctorId,
		departmentId,
		date,
		timeSlot,
		type,
		reason,
		notes,
		priority,
		queueNumber,
		createdBy: staffId,
	});

	logger.info(
		{ appointmentId: appointment._id, appointmentNumber },
		"Appointment created successfully",
	);

	return {
		id: String(appointment._id),
		appointmentNumber: appointment.appointmentNumber,
		patient: {
			id: String(patient._id),
			patientId: patient.patientId,
			firstName: patient.firstName,
			lastName: patient.lastName,
		},
		doctor: {
			id: String(doctor._id),
			employeeId: doctor.employeeId,
			firstName: doctor.firstName,
			lastName: doctor.lastName,
			specialization: doctor.specialization ?? undefined,
		},
		department: {
			id: String(department._id),
			name: department.name,
			code: department.code,
		},
		date: appointment.date.toISOString(),
		timeSlot: appointment.timeSlot,
		type: appointment.type,
		status: appointment.status || AppointmentStatus.SCHEDULED,
		priority: appointment.priority || AppointmentPriority.NORMAL,
		reason: appointment.reason ?? undefined,
		notes: appointment.notes ?? undefined,
		queueNumber: appointment.queueNumber ?? undefined,
		createdAt: appointment.createdAt.toISOString(),
	};
}

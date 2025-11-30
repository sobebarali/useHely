import { Appointment } from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { CreateAppointmentInput } from "../validations/create.appointments.validation";

const logger = createRepositoryLogger("createAppointment");

/**
 * Create a new appointment record
 */
export async function createAppointment({
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
	createdBy,
}: {
	tenantId: string;
	appointmentNumber: string;
	queueNumber?: number;
	createdBy?: string;
} & CreateAppointmentInput) {
	try {
		const id = uuidv4();

		logger.debug(
			{ id, tenantId, appointmentNumber, patientId, doctorId },
			"Creating appointment",
		);

		const appointment = await Appointment.create({
			_id: id,
			tenantId,
			appointmentNumber,
			patientId,
			doctorId,
			departmentId,
			date: new Date(date),
			timeSlot,
			type,
			reason,
			notes,
			priority,
			status: "SCHEDULED",
			queueNumber,
			createdBy,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		logDatabaseOperation(
			logger,
			"create",
			"appointment",
			{ tenantId, appointmentNumber },
			{ _id: appointment._id },
		);

		logger.info(
			{ id, tenantId, appointmentNumber },
			"Appointment created successfully",
		);

		return appointment;
	} catch (error) {
		logError(logger, error, "Failed to create appointment", { tenantId });
		throw error;
	}
}

import { Patient } from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { RegisterPatientInput } from "../validations/register.patients.validation";

const logger = createRepositoryLogger("registerPatient");

/**
 * Create a new patient record
 */
export async function createPatient({
	tenantId,
	patientId,
	firstName,
	lastName,
	dateOfBirth,
	gender,
	bloodGroup,
	phone,
	email,
	address,
	emergencyContact,
	patientType,
	department,
	assignedDoctor,
	photoUrl,
}: {
	tenantId: string;
	patientId: string;
	photoUrl?: string;
} & RegisterPatientInput) {
	try {
		const id = uuidv4();

		logger.debug({ id, tenantId, patientId }, "Creating patient");

		const patient = await Patient.create({
			_id: id,
			tenantId,
			patientId,
			firstName,
			lastName,
			dateOfBirth: new Date(dateOfBirth),
			gender,
			bloodGroup,
			phone,
			email,
			address,
			emergencyContact,
			patientType,
			departmentId: department,
			assignedDoctorId: assignedDoctor,
			photoUrl,
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		logDatabaseOperation(
			logger,
			"create",
			"patient",
			{ tenantId, patientId },
			{ _id: patient._id },
		);

		logger.info({ id, tenantId, patientId }, "Patient created successfully");

		return patient;
	} catch (error) {
		logError(logger, error, "Failed to create patient", { tenantId });
		throw error;
	}
}

import { BadRequestError, ConflictError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { findDepartmentById } from "../../users/repositories/shared.users.repository";
import { createPatient } from "../repositories/register.patients.repository";
import {
	findPatientByEmail,
	findPatientByPhone,
	generatePatientId,
} from "../repositories/shared.patients.repository";
import type { RegisterPatientInput } from "../validations/register.patients.validation";

const logger = createServiceLogger("registerPatient");

/**
 * Register a new patient within the hospital tenant
 */
export async function registerPatientService({
	tenantId,
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
	photo,
}: {
	tenantId: string;
} & RegisterPatientInput) {
	logger.info({ tenantId, firstName, lastName }, "Registering new patient");

	// Check for duplicate email if provided
	if (email) {
		const existingByEmail = await findPatientByEmail({
			tenantId,
			email,
		});
		if (existingByEmail) {
			logger.warn({ tenantId, email }, "Email already exists");
			throw new ConflictError(
				"A patient with this email already exists",
				"EMAIL_EXISTS",
			);
		}
	}

	// Check for duplicate phone
	const existingByPhone = await findPatientByPhone({
		tenantId,
		phone,
	});
	if (existingByPhone) {
		logger.warn({ tenantId, phone }, "Phone already exists");
		throw new ConflictError(
			"A patient with this phone number already exists",
			"PHONE_EXISTS",
		);
	}

	// Validate department if provided
	if (department) {
		const dept = await findDepartmentById({
			tenantId,
			departmentId: department,
		});
		if (!dept) {
			logger.warn({ tenantId, department }, "Department not found");
			throw new BadRequestError("Invalid department", "INVALID_DEPARTMENT");
		}
	}

	// TODO: Validate assigned doctor if provided
	// Would need to check Staff with doctor role

	// Generate patient ID
	const patientId = await generatePatientId({ tenantId });

	// Handle photo upload (in production, would upload to S3/cloud storage)
	let photoUrl: string | undefined;
	if (photo) {
		// For now, we'll skip actual upload - in production this would go to cloud storage
		// photoUrl = await uploadPatientPhoto({ tenantId, patientId, photo });
		logger.debug({ patientId }, "Photo upload skipped - would upload to cloud");
	}

	// Create patient record
	const patient = await createPatient({
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
	});

	logger.info(
		{
			patientId: patient.patientId,
			tenantId,
		},
		"Patient registered successfully",
	);

	return {
		id: String(patient._id),
		patientId: patient.patientId,
		firstName: patient.firstName,
		lastName: patient.lastName,
		dateOfBirth: patient.dateOfBirth.toISOString(),
		gender: patient.gender,
		patientType: patient.patientType,
		status: patient.status || "ACTIVE",
		createdAt: patient.createdAt.toISOString(),
	};
}

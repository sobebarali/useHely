import { Department } from "@hms/db";
import { BadRequestError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { findPatientById } from "../repositories/shared.patients.repository";
import { updatePatient } from "../repositories/update.patients.repository";
import type { UpdatePatientInput } from "../validations/update.patients.validation";

const logger = createServiceLogger("updatePatient");

/**
 * Update patient information
 */
export async function updatePatientService({
	tenantId,
	patientId,
	phone,
	email,
	address,
	emergencyContact,
	department,
	assignedDoctor,
	patientType,
	photo,
}: {
	tenantId: string;
	patientId: string;
} & UpdatePatientInput) {
	logger.info({ tenantId, patientId }, "Updating patient");

	// Check if patient exists
	const existingPatient = await findPatientById({ tenantId, patientId });
	if (!existingPatient) {
		logger.warn({ tenantId, patientId }, "Patient not found");
		throw new NotFoundError("Patient not found", "NOT_FOUND");
	}

	// Validate department if provided
	if (department) {
		const dept = await Department.findOne({
			_id: department,
			tenantId,
		}).lean();
		if (!dept) {
			logger.warn({ tenantId, department }, "Department not found");
			throw new BadRequestError("Invalid department", "INVALID_DEPARTMENT");
		}
	}

	// TODO: Validate assigned doctor if provided

	// Handle photo upload (in production, would upload to S3/cloud storage)
	let photoUrl: string | undefined;
	if (photo) {
		// For now, we'll skip actual upload - in production this would go to cloud storage
		logger.debug({ patientId }, "Photo upload skipped - would upload to cloud");
	}

	// Update patient
	const updatedPatient = await updatePatient({
		tenantId,
		patientId,
		phone,
		email,
		address,
		emergencyContact,
		department,
		assignedDoctor,
		patientType,
		photoUrl,
	});

	if (!updatedPatient) {
		throw new NotFoundError("Patient not found", "NOT_FOUND");
	}

	// Get department name if assigned
	let departmentName: string | undefined;
	if (updatedPatient.departmentId) {
		const dept = await Department.findById(updatedPatient.departmentId).lean();
		departmentName = dept?.name;
	}

	logger.info({ patientId, tenantId }, "Patient updated successfully");

	return {
		id: String(updatedPatient._id),
		patientId: updatedPatient.patientId,
		firstName: updatedPatient.firstName,
		lastName: updatedPatient.lastName,
		phone: updatedPatient.phone,
		email: updatedPatient.email || undefined,
		patientType: updatedPatient.patientType,
		department: departmentName,
		status: updatedPatient.status || "ACTIVE",
		updatedAt:
			updatedPatient.updatedAt?.toISOString() || new Date().toISOString(),
	};
}

import { BadRequestError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { uploadPatientPhoto } from "../../../lib/storage";
import {
	findDepartmentById,
	findPatientById,
} from "../repositories/shared.patients.repository";
import { updatePatient } from "../repositories/update.patients.repository";
import type {
	UpdatePatientInput,
	UpdatePatientOutput,
} from "../validations/update.patients.validation";

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
} & UpdatePatientInput): Promise<UpdatePatientOutput> {
	logger.info({ tenantId, patientId }, "Updating patient");

	// Check if patient exists
	const existingPatient = await findPatientById({ tenantId, patientId });
	if (!existingPatient) {
		logger.warn({ tenantId, patientId }, "Patient not found");
		throw new NotFoundError("Patient not found", "NOT_FOUND");
	}

	// Validate department if provided (using repository, not direct model access)
	if (department) {
		const dept = await findDepartmentById({ departmentId: department });
		if (!dept || dept.tenantId !== tenantId) {
			logger.warn({ tenantId, department }, "Department not found");
			throw new BadRequestError("Invalid department", "INVALID_DEPARTMENT");
		}
	}

	// TODO: Validate assigned doctor if provided

	// Handle photo upload to R2 storage
	let photoUrl: string | undefined;
	if (photo) {
		try {
			const uploadedUrl = await uploadPatientPhoto({
				tenantId,
				patientId,
				base64Data: photo,
			});
			if (uploadedUrl) {
				photoUrl = uploadedUrl;
				logger.info({ patientId }, "Patient photo uploaded successfully");
			} else {
				logger.warn(
					{ patientId },
					"Photo upload skipped - storage not configured",
				);
			}
		} catch (error) {
			logger.error({ patientId, error }, "Failed to upload patient photo");
			// Continue without photo - non-critical failure
		}
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

	// Get department name if assigned (using repository)
	let departmentName: string | undefined;
	if (updatedPatient.departmentId) {
		const dept = await findDepartmentById({
			departmentId: updatedPatient.departmentId,
		});
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

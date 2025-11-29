import { Patient } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { UpdatePatientInput } from "../validations/update.patients.validation";

const logger = createRepositoryLogger("updatePatient");

/**
 * Update patient record
 */
export async function updatePatient({
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
}: {
	tenantId: string;
	patientId: string;
	photoUrl?: string;
} & UpdatePatientInput) {
	try {
		logger.debug({ tenantId, patientId }, "Updating patient");

		// Build update object
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		};

		if (phone !== undefined) {
			updateData.phone = phone;
		}

		if (email !== undefined) {
			updateData.email = email;
		}

		if (address !== undefined) {
			// Merge with existing address
			updateData["address.street"] = address.street;
			updateData["address.city"] = address.city;
			updateData["address.state"] = address.state;
			updateData["address.postalCode"] = address.postalCode;
			updateData["address.country"] = address.country;
		}

		if (emergencyContact !== undefined) {
			updateData["emergencyContact.name"] = emergencyContact.name;
			updateData["emergencyContact.relationship"] =
				emergencyContact.relationship;
			updateData["emergencyContact.phone"] = emergencyContact.phone;
		}

		if (department !== undefined) {
			updateData.departmentId = department;
		}

		if (assignedDoctor !== undefined) {
			updateData.assignedDoctorId = assignedDoctor;
		}

		if (patientType !== undefined) {
			updateData.patientType = patientType;
		}

		if (photoUrl !== undefined) {
			updateData.photoUrl = photoUrl;
		}

		// Remove undefined values from nested updates
		const cleanedUpdate: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(updateData)) {
			if (value !== undefined) {
				cleanedUpdate[key] = value;
			}
		}

		const patient = await Patient.findOneAndUpdate(
			{ _id: patientId, tenantId },
			{ $set: cleanedUpdate },
			{ new: true },
		).lean();

		if (!patient) {
			logDatabaseOperation(
				logger,
				"findOneAndUpdate",
				"patient",
				{ tenantId, patientId },
				{ found: false },
			);
			return null;
		}

		logDatabaseOperation(
			logger,
			"findOneAndUpdate",
			"patient",
			{ tenantId, patientId },
			{ _id: patient._id },
		);

		logger.info({ patientId, tenantId }, "Patient updated successfully");

		return patient;
	} catch (error) {
		logError(logger, error, "Failed to update patient", {
			tenantId,
			patientId,
		});
		throw error;
	}
}

import { Department, Patient, Staff } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("getPatientById");

/**
 * Get patient by ID with full details
 */
export async function getPatientById({
	tenantId,
	patientId,
}: {
	tenantId: string;
	patientId: string;
}) {
	try {
		logger.debug({ tenantId, patientId }, "Getting patient by ID");

		const patient = await Patient.findOne({
			_id: patientId,
			tenantId,
		}).lean();

		if (!patient) {
			logDatabaseOperation(
				logger,
				"findOne",
				"patient",
				{ tenantId, patientId },
				{ found: false },
			);
			return null;
		}

		logDatabaseOperation(
			logger,
			"findOne",
			"patient",
			{ tenantId, patientId },
			{ _id: patient._id, found: true },
		);

		// Get department if assigned
		let department = null;
		if (patient.departmentId) {
			department = await Department.findById(patient.departmentId).lean();
		}

		// Get assigned doctor if assigned
		let assignedDoctor = null;
		if (patient.assignedDoctorId) {
			assignedDoctor = await Staff.findById(patient.assignedDoctorId).lean();
		}

		// Calculate age
		const birthDate = new Date(patient.dateOfBirth);
		const today = new Date();
		let age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();
		if (
			monthDiff < 0 ||
			(monthDiff === 0 && today.getDate() < birthDate.getDate())
		) {
			age--;
		}

		logger.info({ patientId, tenantId }, "Patient retrieved successfully");

		return {
			patient,
			department,
			assignedDoctor,
			age,
		};
	} catch (error) {
		logError(logger, error, "Failed to get patient by ID", {
			tenantId,
			patientId,
		});
		throw error;
	}
}

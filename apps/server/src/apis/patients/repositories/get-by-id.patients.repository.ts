import { Patient } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("getPatientById");

/**
 * Get patient by ID with related data IDs
 * Returns raw patient data - business logic (age calculation, etc.) should be in service
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

		logDatabaseOperation(
			logger,
			"findOne",
			"patient",
			{ tenantId, patientId },
			patient ? { _id: patient._id, found: true } : { found: false },
		);

		if (!patient) {
			return null;
		}

		logger.info({ patientId, tenantId }, "Patient retrieved successfully");

		return patient;
	} catch (error) {
		logError(logger, error, "Failed to get patient by ID", {
			tenantId,
			patientId,
		});
		throw error;
	}
}

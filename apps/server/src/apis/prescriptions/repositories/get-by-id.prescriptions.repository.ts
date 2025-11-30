import { Prescription } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { PrescriptionLean } from "./shared.prescriptions.repository";

const logger = createRepositoryLogger("getPrescriptionById");

/**
 * Get prescription by ID with full details
 */
export async function getPrescriptionById({
	tenantId,
	prescriptionId,
}: {
	tenantId: string;
	prescriptionId: string;
}): Promise<PrescriptionLean | null> {
	try {
		logger.debug({ tenantId, prescriptionId }, "Getting prescription by ID");

		const prescription = await Prescription.findOne({
			_id: prescriptionId,
			tenantId,
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"prescription",
			{ tenantId, prescriptionId },
			prescription ? { _id: prescription._id, found: true } : { found: false },
		);

		return prescription as PrescriptionLean | null;
	} catch (error) {
		logError(logger, error, "Failed to get prescription by ID");
		throw error;
	}
}

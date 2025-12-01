import { Dispensing, MedicineDispensingStatus } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { MedicineDispensingDetail } from "../validations/dispense.dispensing.validation";
import type { DispensingLean } from "./shared.dispensing.repository";

const logger = createRepositoryLogger("dispenseDispensing");

/**
 * Update dispensing record with dispensed medicine details.
 * Uses atomic findOneAndUpdate operations to prevent lost updates
 * under concurrent access.
 */
export async function updateDispensedMedicines({
	tenantId,
	prescriptionId,
	medicines,
}: {
	tenantId: string;
	prescriptionId: string;
	medicines: MedicineDispensingDetail[];
}): Promise<DispensingLean | null> {
	try {
		logger.debug(
			{ tenantId, prescriptionId, medicineCount: medicines.length },
			"Updating dispensed medicines atomically",
		);

		const now = new Date();

		// Build atomic update operations for each medicine using arrayFilters
		const updateOperations: Record<string, unknown> = {};
		const arrayFilters: Array<Record<string, unknown>> = [];

		medicines.forEach((med, index) => {
			const filterKey = `med${index}`;

			// Set the dispensed quantity and status for matching medicine
			updateOperations[`medicines.$[${filterKey}].dispensedQuantity`] =
				med.dispensedQuantity;
			updateOperations[`medicines.$[${filterKey}].status`] =
				MedicineDispensingStatus.DISPENSED;

			// Set optional fields if provided
			if (med.batchNumber) {
				updateOperations[`medicines.$[${filterKey}].batchNumber`] =
					med.batchNumber;
			}
			if (med.expiryDate) {
				updateOperations[`medicines.$[${filterKey}].expiryDate`] = new Date(
					med.expiryDate,
				);
			}
			if (med.substituted !== undefined) {
				updateOperations[`medicines.$[${filterKey}].substituted`] =
					med.substituted;
			}
			if (med.substituteNote) {
				updateOperations[`medicines.$[${filterKey}].substituteNote`] =
					med.substituteNote;
			}

			// Add array filter to match the specific medicine by ID
			arrayFilters.push({ [`${filterKey}.medicineId`]: med.medicineId });
		});

		// Add updatedAt timestamp
		updateOperations.updatedAt = now;

		// Perform atomic update with arrayFilters
		const updatedDispensing = await Dispensing.findOneAndUpdate(
			{
				tenantId,
				prescriptionId,
			},
			{ $set: updateOperations },
			{
				new: true,
				arrayFilters,
			},
		).lean();

		if (!updatedDispensing) {
			return null;
		}

		logDatabaseOperation(
			logger,
			"update",
			"dispensing",
			{ tenantId, prescriptionId },
			{ updated: true, medicineCount: medicines.length },
		);

		return updatedDispensing as unknown as DispensingLean;
	} catch (error) {
		logError(logger, error, "Failed to update dispensed medicines");
		throw error;
	}
}

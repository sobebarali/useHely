import { Dispensing, MedicineDispensingStatus } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { DispensingLean } from "./shared.dispensing.repository";

const logger = createRepositoryLogger("unavailableDispensing");

// Interface for medicine subdocument
interface MedicineSubdoc {
	medicineId: string;
	dispensedQuantity: number;
	batchNumber?: string;
	expiryDate?: Date;
	substituted: boolean;
	substituteNote?: string;
	status: string;
}

/**
 * Mark a medicine as unavailable in dispensing record
 */
export async function markMedicineUnavailable({
	tenantId,
	prescriptionId,
	medicineId,
	reason,
	alternativeSuggested,
}: {
	tenantId: string;
	prescriptionId: string;
	medicineId: string;
	reason: string;
	alternativeSuggested?: string;
}): Promise<DispensingLean | null> {
	try {
		logger.debug(
			{ tenantId, prescriptionId, medicineId },
			"Marking medicine as unavailable",
		);

		// Get current dispensing record
		const dispensing = await Dispensing.findOne({
			tenantId,
			prescriptionId,
		});

		if (!dispensing) {
			return null;
		}

		// Find and update the medicine
		const medicineArray = dispensing.medicines as unknown as MedicineSubdoc[];
		const medicineIndex = medicineArray.findIndex(
			(m) => m.medicineId === medicineId,
		);

		if (medicineIndex === -1) {
			return null;
		}

		const medicine = medicineArray[medicineIndex];
		if (medicine) {
			medicine.status = MedicineDispensingStatus.UNAVAILABLE;
			// Store reason in substituteNote field as there's no separate reason field
			medicine.substituteNote = alternativeSuggested
				? `Reason: ${reason}. Alternative: ${alternativeSuggested}`
				: `Reason: ${reason}`;
		}

		await dispensing.save();

		logDatabaseOperation(
			logger,
			"update",
			"dispensing",
			{ tenantId, prescriptionId, medicineId },
			{ updated: true, status: "UNAVAILABLE" },
		);

		return dispensing.toObject() as unknown as DispensingLean;
	} catch (error) {
		logError(logger, error, "Failed to mark medicine as unavailable");
		throw error;
	}
}

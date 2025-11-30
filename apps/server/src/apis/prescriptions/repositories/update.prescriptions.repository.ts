import { Prescription } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { PrescriptionLean } from "./shared.prescriptions.repository";

const logger = createRepositoryLogger("updatePrescription");

/**
 * Update a prescription
 */
export async function updatePrescription({
	tenantId,
	prescriptionId,
	diagnosis,
	notes,
	medicines,
	followUpDate,
}: {
	tenantId: string;
	prescriptionId: string;
	diagnosis?: string;
	notes?: string;
	medicines?: {
		name: string;
		dosage: string;
		frequency: string;
		duration: string;
		instructions?: string;
		route?: string;
		quantity?: number;
	}[];
	followUpDate?: string;
}): Promise<PrescriptionLean | null> {
	try {
		logger.debug({ tenantId, prescriptionId }, "Updating prescription");

		// Build update object
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		};

		if (diagnosis !== undefined) {
			updateData.diagnosis = diagnosis;
		}

		if (notes !== undefined) {
			updateData.notes = notes;
		}

		if (followUpDate !== undefined) {
			updateData.followUpDate = new Date(followUpDate);
		}

		if (medicines !== undefined) {
			// Map medicines - Mongoose will auto-generate ObjectId for _id
			updateData.medicines = medicines.map((med) => ({
				name: med.name,
				dosage: med.dosage,
				frequency: med.frequency,
				duration: med.duration,
				instructions: med.instructions,
				route: med.route,
				quantity: med.quantity,
				dispensed: false,
				dispensedQuantity: 0,
			}));
		}

		const prescription = await Prescription.findOneAndUpdate(
			{ _id: prescriptionId, tenantId },
			{ $set: updateData },
			{ new: true },
		).lean();

		logDatabaseOperation(
			logger,
			"findOneAndUpdate",
			"prescription",
			{ tenantId, prescriptionId },
			prescription
				? { _id: prescription._id, updated: true }
				: { updated: false },
		);

		return prescription as unknown as PrescriptionLean | null;
	} catch (error) {
		logError(logger, error, "Failed to update prescription");
		throw error;
	}
}

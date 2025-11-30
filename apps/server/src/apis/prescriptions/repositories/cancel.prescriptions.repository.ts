import { Prescription } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { PrescriptionLean } from "./shared.prescriptions.repository";

const logger = createRepositoryLogger("cancelPrescription");

/**
 * Cancel a prescription by updating its status to CANCELLED
 */
export async function cancelPrescription({
	tenantId,
	prescriptionId,
	cancelledBy,
	reason,
}: {
	tenantId: string;
	prescriptionId: string;
	cancelledBy: string;
	reason?: string;
}): Promise<PrescriptionLean | null> {
	try {
		logger.debug({ tenantId, prescriptionId }, "Cancelling prescription");

		const updateData: Record<string, unknown> = {
			status: "CANCELLED",
			cancelledAt: new Date(),
			cancelledBy,
			updatedAt: new Date(),
		};

		if (reason) {
			updateData.cancellationReason = reason;
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
				? { _id: prescription._id, status: "CANCELLED" }
				: { cancelled: false },
		);

		return prescription as unknown as PrescriptionLean | null;
	} catch (error) {
		logError(logger, error, "Failed to cancel prescription");
		throw error;
	}
}

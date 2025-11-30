import { BadRequestError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { cancelPrescription } from "../repositories/cancel.prescriptions.repository";
import {
	findPrescriptionById,
	findStaffById,
} from "../repositories/shared.prescriptions.repository";
import type { CancelPrescriptionOutput } from "../validations/cancel.prescriptions.validation";

const logger = createServiceLogger("cancelPrescription");

/**
 * Cancel a prescription
 */
export async function cancelPrescriptionService({
	tenantId,
	prescriptionId,
	staffId,
	reason,
}: {
	tenantId: string;
	prescriptionId: string;
	staffId: string;
	reason?: string;
}): Promise<CancelPrescriptionOutput> {
	logger.info({ tenantId, prescriptionId }, "Cancelling prescription");

	// Get existing prescription
	const existingPrescription = await findPrescriptionById({
		tenantId,
		prescriptionId,
	});

	if (!existingPrescription) {
		logger.warn({ tenantId, prescriptionId }, "Prescription not found");
		throw new NotFoundError("Prescription not found", "PRESCRIPTION_NOT_FOUND");
	}

	// Check if prescription can be cancelled (only PENDING or DISPENSING)
	if (
		existingPrescription.status !== "PENDING" &&
		existingPrescription.status !== "DISPENSING"
	) {
		logger.warn(
			{ tenantId, prescriptionId, status: existingPrescription.status },
			"Cannot cancel prescription with current status",
		);
		throw new BadRequestError(
			`Cannot cancel prescription with status: ${existingPrescription.status}`,
			"INVALID_STATUS",
		);
	}

	// Cancel prescription
	const prescription = await cancelPrescription({
		tenantId,
		prescriptionId,
		cancelledBy: staffId,
		reason,
	});

	if (!prescription) {
		throw new NotFoundError("Prescription not found", "PRESCRIPTION_NOT_FOUND");
	}

	// Get staff details for response
	const staff = await findStaffById({ tenantId, staffId });

	logger.info(
		{ tenantId, prescriptionId },
		"Prescription cancelled successfully",
	);

	// Map to output DTO
	return {
		id: String(prescription._id),
		prescriptionId: prescription.prescriptionId,
		status: prescription.status,
		cancelledAt:
			prescription.cancelledAt?.toISOString() || new Date().toISOString(),
		cancelledBy: {
			id: staffId,
			firstName: staff?.firstName || "",
			lastName: staff?.lastName || "",
		},
		cancellationReason: prescription.cancellationReason,
	};
}

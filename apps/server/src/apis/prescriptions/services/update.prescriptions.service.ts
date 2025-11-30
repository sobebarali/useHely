import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
} from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { findPrescriptionById } from "../repositories/shared.prescriptions.repository";
import { updatePrescription } from "../repositories/update.prescriptions.repository";
import type { UpdatePrescriptionOutput } from "../validations/update.prescriptions.validation";

const logger = createServiceLogger("updatePrescription");

/**
 * Update a prescription
 */
export async function updatePrescriptionService({
	tenantId,
	prescriptionId,
	doctorId,
	diagnosis,
	notes,
	medicines,
	followUpDate,
}: {
	tenantId: string;
	prescriptionId: string;
	doctorId: string;
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
}): Promise<UpdatePrescriptionOutput> {
	logger.info({ tenantId, prescriptionId }, "Updating prescription");

	// Get existing prescription
	const existingPrescription = await findPrescriptionById({
		tenantId,
		prescriptionId,
	});

	if (!existingPrescription) {
		logger.warn({ tenantId, prescriptionId }, "Prescription not found");
		throw new NotFoundError("Prescription not found", "PRESCRIPTION_NOT_FOUND");
	}

	// Check if prescription can be modified (not dispensed, completed, or cancelled)
	if (
		existingPrescription.status === "DISPENSED" ||
		existingPrescription.status === "COMPLETED" ||
		existingPrescription.status === "CANCELLED"
	) {
		logger.warn(
			{ tenantId, prescriptionId, status: existingPrescription.status },
			"Cannot modify prescription with terminal status",
		);
		throw new BadRequestError(
			`Cannot modify prescription with status: ${existingPrescription.status}`,
			"PRESCRIPTION_NOT_MODIFIABLE",
		);
	}

	// Check if the current user is the prescribing doctor
	if (existingPrescription.doctorId !== doctorId) {
		logger.warn(
			{ tenantId, prescriptionId, doctorId },
			"Only prescribing doctor can modify prescription",
		);
		throw new ForbiddenError(
			"Only the prescribing doctor can modify this prescription",
			"NOT_PRESCRIBING_DOCTOR",
		);
	}

	// Validate medicines if provided
	if (medicines && medicines.length === 0) {
		throw new BadRequestError(
			"At least one medicine is required",
			"EMPTY_MEDICINES",
		);
	}

	// Update prescription
	const prescription = await updatePrescription({
		tenantId,
		prescriptionId,
		diagnosis,
		notes,
		medicines,
		followUpDate,
	});

	if (!prescription) {
		throw new NotFoundError("Prescription not found", "PRESCRIPTION_NOT_FOUND");
	}

	logger.info(
		{ tenantId, prescriptionId },
		"Prescription updated successfully",
	);

	// Map to output DTO
	return {
		id: String(prescription._id),
		prescriptionId: prescription.prescriptionId,
		patientId: String(prescription.patientId),
		doctorId: String(prescription.doctorId),
		diagnosis: prescription.diagnosis,
		notes: prescription.notes,
		medicines: prescription.medicines.map((med) => ({
			id: String(med._id),
			name: med.name,
			dosage: med.dosage,
			frequency: med.frequency,
			duration: med.duration,
			instructions: med.instructions,
			route: med.route,
			quantity: med.quantity,
		})),
		status: prescription.status || "PENDING",
		followUpDate: prescription.followUpDate?.toISOString(),
		updatedAt:
			prescription.updatedAt?.toISOString() || new Date().toISOString(),
	};
}

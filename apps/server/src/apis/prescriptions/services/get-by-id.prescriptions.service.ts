import { NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { getPrescriptionById } from "../repositories/get-by-id.prescriptions.repository";
import {
	findPatientById,
	findStaffById,
} from "../repositories/shared.prescriptions.repository";
import type { GetPrescriptionByIdOutput } from "../validations/get-by-id.prescriptions.validation";

const logger = createServiceLogger("getPrescriptionById");

/**
 * Get prescription by ID with full details
 */
export async function getPrescriptionByIdService({
	tenantId,
	prescriptionId,
}: {
	tenantId: string;
	prescriptionId: string;
}): Promise<GetPrescriptionByIdOutput> {
	logger.info({ tenantId, prescriptionId }, "Getting prescription by ID");

	// Get prescription
	const prescription = await getPrescriptionById({ tenantId, prescriptionId });

	if (!prescription) {
		logger.warn({ tenantId, prescriptionId }, "Prescription not found");
		throw new NotFoundError("Prescription not found", "PRESCRIPTION_NOT_FOUND");
	}

	// Get patient and doctor details
	const [patient, doctor] = await Promise.all([
		findPatientById({ tenantId, patientId: prescription.patientId }),
		findStaffById({ tenantId, staffId: prescription.doctorId }),
	]);

	// Get pharmacist details if dispensed
	// Note: dispensedBy field would need to be added to prescription model
	// For now, we'll leave it undefined
	const dispensedBy: undefined = undefined;

	logger.info(
		{ tenantId, prescriptionId },
		"Prescription retrieved successfully",
	);

	// Map to output DTO
	return {
		id: String(prescription._id),
		prescriptionId: prescription.prescriptionId,
		patient: {
			id: String(patient?._id || prescription.patientId),
			patientId: patient?.patientId || "",
			firstName: patient?.firstName || "",
			lastName: patient?.lastName || "",
			dateOfBirth: patient?.dateOfBirth?.toISOString() || "",
			gender: patient?.gender || "",
			phone: patient?.phone || "",
			email: patient?.email ?? undefined,
		},
		doctor: {
			id: String(doctor?._id || prescription.doctorId),
			firstName: doctor?.firstName || "",
			lastName: doctor?.lastName || "",
			specialization: doctor?.specialization ?? undefined,
			departmentId: doctor?.departmentId ?? undefined,
		},
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
			dispensed: med.dispensed || false,
			dispensedQuantity: med.dispensedQuantity || 0,
		})),
		status: prescription.status || "PENDING",
		followUpDate: prescription.followUpDate?.toISOString(),
		dispensedBy,
		dispensedAt: undefined, // Would need to be added to prescription model
		createdAt:
			prescription.createdAt?.toISOString() || new Date().toISOString(),
		updatedAt:
			prescription.updatedAt?.toISOString() || new Date().toISOString(),
	};
}

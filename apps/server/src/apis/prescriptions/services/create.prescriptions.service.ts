import { BadRequestError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { createPrescription } from "../repositories/create.prescriptions.repository";
import {
	findPatientById,
	findStaffById,
	findTemplateById,
	generatePrescriptionId,
} from "../repositories/shared.prescriptions.repository";
import type {
	CreatePrescriptionInput,
	CreatePrescriptionOutput,
	MedicineInput,
} from "../validations/create.prescriptions.validation";

const logger = createServiceLogger("createPrescription");

/**
 * Create a new prescription
 */
export async function createPrescriptionService({
	tenantId,
	doctorId,
	patientId,
	diagnosis,
	notes,
	medicines,
	followUpDate,
	templateId,
}: {
	tenantId: string;
	doctorId: string;
} & CreatePrescriptionInput): Promise<CreatePrescriptionOutput> {
	logger.info({ tenantId, patientId, doctorId }, "Creating prescription");

	// Validate patient exists
	const patient = await findPatientById({ tenantId, patientId });
	if (!patient) {
		logger.warn({ tenantId, patientId }, "Patient not found");
		throw new NotFoundError("Patient not found", "PATIENT_NOT_FOUND");
	}

	// Check patient status is active
	if (patient.status !== "ACTIVE") {
		logger.warn(
			{ tenantId, patientId, status: patient.status },
			"Patient is not active",
		);
		throw new BadRequestError(
			"Cannot create prescription for inactive patient",
			"PATIENT_INACTIVE",
		);
	}

	// Get doctor details
	const doctor = await findStaffById({ tenantId, staffId: doctorId });
	if (!doctor) {
		logger.warn({ tenantId, doctorId }, "Doctor not found");
		throw new NotFoundError("Doctor not found", "DOCTOR_NOT_FOUND");
	}

	// Process medicines - merge with template if provided
	let finalMedicines: MedicineInput[] = [...medicines];

	if (templateId) {
		const template = await findTemplateById({ tenantId, templateId });
		if (!template) {
			logger.warn({ tenantId, templateId }, "Template not found");
			throw new NotFoundError("Template not found", "TEMPLATE_NOT_FOUND");
		}

		// Merge template medicines with provided medicines
		// Template medicines come first, then custom medicines
		const templateMedicines: MedicineInput[] = template.medicines.map(
			(med) => ({
				name: med.name,
				dosage: med.dosage || "",
				frequency: med.frequency || "",
				duration: med.duration || "",
				instructions: med.instructions,
				route: med.route,
			}),
		);

		finalMedicines = [...templateMedicines, ...medicines];
	}

	// Validate at least one medicine
	if (finalMedicines.length === 0) {
		throw new BadRequestError(
			"At least one medicine is required",
			"EMPTY_MEDICINES",
		);
	}

	// Generate prescription ID
	const prescriptionId = await generatePrescriptionId({ tenantId });

	// Create prescription
	const prescription = await createPrescription({
		tenantId,
		prescriptionId,
		patientId,
		doctorId,
		diagnosis,
		notes,
		medicines: finalMedicines,
		followUpDate,
		templateId,
	});

	logger.info(
		{
			prescriptionId: prescription.prescriptionId,
			tenantId,
		},
		"Prescription created successfully",
	);

	// Map to output DTO
	return {
		id: String(prescription._id),
		prescriptionId: prescription.prescriptionId,
		patientId: String(prescription.patientId),
		patient: {
			id: String(patient._id),
			patientId: patient.patientId,
			firstName: patient.firstName,
			lastName: patient.lastName,
		},
		doctorId: String(prescription.doctorId),
		doctor: {
			id: String(doctor._id),
			firstName: doctor.firstName,
			lastName: doctor.lastName,
			specialization: doctor.specialization ?? undefined,
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
		createdAt:
			prescription.createdAt?.toISOString() || new Date().toISOString(),
	};
}

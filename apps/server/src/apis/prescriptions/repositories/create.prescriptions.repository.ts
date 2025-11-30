import { Prescription } from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { MedicineInput } from "../validations/create.prescriptions.validation";
import type { PrescriptionLean } from "./shared.prescriptions.repository";

const logger = createRepositoryLogger("createPrescription");

/**
 * Create a new prescription record
 */
export async function createPrescription({
	tenantId,
	prescriptionId,
	patientId,
	doctorId,
	diagnosis,
	notes,
	medicines,
	followUpDate,
	templateId,
}: {
	tenantId: string;
	prescriptionId: string;
	patientId: string;
	doctorId: string;
	diagnosis: string;
	notes?: string;
	medicines: MedicineInput[];
	followUpDate?: string;
	templateId?: string;
}): Promise<PrescriptionLean> {
	try {
		const id = uuidv4();

		logger.debug({ id, tenantId, prescriptionId }, "Creating prescription");

		// Map medicines - Mongoose will auto-generate ObjectId for _id
		const medicinesWithDefaults = medicines.map((med) => ({
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

		const prescription = await Prescription.create({
			_id: id,
			tenantId,
			prescriptionId,
			patientId,
			doctorId,
			diagnosis,
			notes,
			medicines: medicinesWithDefaults,
			status: "PENDING",
			followUpDate: followUpDate ? new Date(followUpDate) : undefined,
			templateId,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		logDatabaseOperation(
			logger,
			"create",
			"prescription",
			{ tenantId, prescriptionId },
			{ _id: prescription._id },
		);

		logger.info(
			{ id, tenantId, prescriptionId },
			"Prescription created successfully",
		);

		// Convert to plain object with proper type
		return prescription.toObject() as unknown as PrescriptionLean;
	} catch (error) {
		logError(logger, error, "Failed to create prescription", { tenantId });
		throw error;
	}
}

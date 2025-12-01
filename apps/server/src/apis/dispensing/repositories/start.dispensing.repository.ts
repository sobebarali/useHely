import {
	Dispensing,
	DispensingStatus,
	MedicineDispensingStatus,
} from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type {
	DispensingLean,
	PrescriptionLean,
} from "./shared.dispensing.repository";

const logger = createRepositoryLogger("startDispensing");

/**
 * Create a new dispensing record when pharmacist starts dispensing
 */
export async function createDispensing({
	dispensingId,
	tenantId,
	prescriptionId,
	assignedTo,
	prescription,
}: {
	dispensingId: string;
	tenantId: string;
	prescriptionId: string;
	assignedTo: string;
	prescription: PrescriptionLean;
}): Promise<DispensingLean> {
	try {
		logger.debug(
			{ tenantId, prescriptionId, assignedTo },
			"Creating dispensing record",
		);

		// Map prescription medicines to dispensing medicines
		const medicines = prescription.medicines.map((med) => ({
			medicineId: String(med._id),
			dispensedQuantity: 0,
			substituted: false,
			status: MedicineDispensingStatus.PENDING,
		}));

		logger.debug({ dispensingId, medicines }, "Dispensing medicines prepared");

		const now = new Date();
		const dispensing = await Dispensing.create({
			_id: dispensingId,
			tenantId,
			prescriptionId,
			status: DispensingStatus.DISPENSING,
			assignedTo,
			startedAt: now,
			medicines,
			patientCounseled: false,
			createdAt: now,
			updatedAt: now,
		});

		if (!dispensing) {
			throw new Error("Failed to create dispensing record");
		}

		logDatabaseOperation(
			logger,
			"create",
			"dispensing",
			{ tenantId, prescriptionId },
			{ _id: dispensing._id },
		);

		return dispensing.toObject() as unknown as DispensingLean;
	} catch (err) {
		logError(logger, err, "Failed to create dispensing record");
		throw err;
	}
}

import { Counter, Medicine } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { MedicineLean } from "./shared.inventory.repository";

const logger = createRepositoryLogger("addMedicineInventory");

interface AddMedicineParams {
	tenantId: string;
	medicineId: string;
	name: string;
	genericName: string;
	code: string;
	category: string;
	type: string;
	manufacturer?: string;
	strength?: string;
	unit: string;
	description?: string;
}

/**
 * Add a new medicine to the catalog
 */
export async function addMedicine(
	params: AddMedicineParams,
): Promise<MedicineLean> {
	try {
		const { tenantId, medicineId, ...data } = params;
		logger.debug({ tenantId, name: data.name }, "Adding medicine");

		const now = new Date();

		const medicine = await Medicine.create({
			_id: medicineId,
			tenantId,
			...data,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		});

		logDatabaseOperation(
			logger,
			"create",
			"medicine",
			{ tenantId, name: data.name },
			{ medicineId },
		);

		return medicine.toObject() as unknown as MedicineLean;
	} catch (error) {
		logError(logger, error, "Failed to add medicine");
		throw error;
	}
}

/**
 * Generate next medicine code for a tenant
 * Format: MED-{sequential}
 */
export async function generateMedicineCode({
	tenantId,
}: {
	tenantId: string;
}): Promise<string> {
	try {
		logger.debug({ tenantId }, "Generating medicine code");

		const counter = await Counter.findOneAndUpdate(
			{ tenantId, type: "medicine_code" },
			{ $inc: { seq: 1 } },
			{ new: true, upsert: true },
		);

		const seq = counter?.seq || 1;
		const code = `MED-${String(seq).padStart(4, "0")}`;

		logDatabaseOperation(
			logger,
			"generateId",
			"counter",
			{ tenantId, type: "medicine_code" },
			{ code, seq },
		);

		return code;
	} catch (error) {
		logError(logger, error, "Failed to generate medicine code");
		throw error;
	}
}

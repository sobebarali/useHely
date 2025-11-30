import { ConflictError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import {
	addMedicine,
	generateMedicineCode,
} from "../repositories/add-medicine.inventory.repository";
import {
	findMedicineByCode,
	generateMedicineId,
} from "../repositories/shared.inventory.repository";
import type {
	AddMedicineInventoryBody,
	AddMedicineInventoryOutput,
} from "../validations/add-medicine.inventory.validation";

const logger = createServiceLogger("addMedicineInventory");

/**
 * Add a new medicine to the catalog
 */
export async function addMedicineInventoryService({
	tenantId,
	name,
	genericName,
	code,
	category,
	type,
	manufacturer,
	strength,
	unit,
	description,
}: {
	tenantId: string;
} & AddMedicineInventoryBody): Promise<AddMedicineInventoryOutput> {
	logger.info({ tenantId, name }, "Adding medicine to catalog");

	// Generate code if not provided
	const medicineCode = code || (await generateMedicineCode({ tenantId }));

	// Check if code already exists
	const existingMedicine = await findMedicineByCode({
		tenantId,
		code: medicineCode,
	});

	if (existingMedicine) {
		throw new ConflictError("Medicine code already exists", "CODE_EXISTS");
	}

	// Generate medicine ID
	const medicineId = await generateMedicineId({ tenantId });

	// Add medicine
	const medicine = await addMedicine({
		tenantId,
		medicineId,
		name,
		genericName,
		code: medicineCode,
		category,
		type,
		manufacturer,
		strength,
		unit,
		description,
	});

	logger.info({ tenantId, medicineId, name }, "Medicine added successfully");

	return {
		id: String(medicine._id),
		name: medicine.name,
		genericName: medicine.genericName || "",
		code: medicine.code,
		category: medicine.category,
		type: medicine.type,
		manufacturer: medicine.manufacturer || null,
		strength: medicine.strength || null,
		unit: medicine.unit,
		description: medicine.description || null,
	};
}

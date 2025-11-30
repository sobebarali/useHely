import { createServiceLogger } from "../../../lib/logger";
import { listMedicines } from "../repositories/list-medicines.inventory.repository";
import type {
	ListMedicinesInventoryInput,
	ListMedicinesInventoryOutput,
	MedicineItemOutput,
} from "../validations/list-medicines.inventory.validation";

const logger = createServiceLogger("listMedicinesInventory");

/**
 * List medicines in catalog
 */
export async function listMedicinesInventoryService({
	tenantId,
	page: pageParam,
	limit: limitParam,
	search,
	category,
	type,
}: {
	tenantId: string;
} & ListMedicinesInventoryInput): Promise<ListMedicinesInventoryOutput> {
	const page = Number(pageParam) || 1;
	const limit = Number(limitParam) || 50;

	logger.info({ tenantId, page, limit }, "Listing medicines");

	const result = await listMedicines({
		tenantId,
		page,
		limit,
		search,
		category,
		type,
	});

	// Map to output DTO
	const data: MedicineItemOutput[] = result.medicines.map((medicine) => ({
		id: String(medicine._id),
		name: medicine.name,
		genericName: medicine.genericName || "",
		code: medicine.code,
		category: medicine.category,
		type: medicine.type,
		manufacturer: medicine.manufacturer || null,
		strength: medicine.strength || null,
		unit: medicine.unit,
	}));

	logger.info(
		{ tenantId, page, limit, total: result.total },
		"Medicines listed successfully",
	);

	return {
		data,
		pagination: {
			page: result.page,
			limit: result.limit,
			total: result.total,
			totalPages: result.totalPages,
		},
	};
}

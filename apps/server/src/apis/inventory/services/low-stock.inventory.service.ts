import { Medicine } from "@hms/db";
import { createServiceLogger } from "../../../lib/logger";
import { getLowStockItems } from "../repositories/low-stock.inventory.repository";
import { findMedicinesByIds } from "../repositories/shared.inventory.repository";
import type {
	LowStockInventoryInput,
	LowStockInventoryOutput,
	LowStockItemOutput,
} from "../validations/low-stock.inventory.validation";

const logger = createServiceLogger("lowStockInventory");

/**
 * Get items with stock at or below reorder level
 */
export async function lowStockInventoryService({
	tenantId,
	limit: limitParam,
	category,
}: {
	tenantId: string;
} & LowStockInventoryInput): Promise<LowStockInventoryOutput> {
	logger.info(
		{ tenantId, limit: limitParam, category },
		"Getting low stock items",
	);

	const limit = Number(limitParam) || 50;

	// If category is provided, first find matching medicines
	let medicineIds: string[] | undefined;
	if (category) {
		const matchingMedicines = await Medicine.find({
			tenantId,
			category,
			isActive: true,
		})
			.select("_id")
			.lean();
		medicineIds = matchingMedicines.map((m) => String(m._id));

		if (medicineIds.length === 0) {
			return { items: [], count: 0 };
		}
	}

	const inventoryItems = await getLowStockItems({
		tenantId,
		limit,
		medicineIds,
	});

	// Get medicine details
	const medicineIdsFromInventory = inventoryItems.map((item) =>
		String(item.medicineId),
	);
	const medicines = await findMedicinesByIds({
		tenantId,
		medicineIds: medicineIdsFromInventory,
	});
	const medicineMap = new Map(medicines.map((m) => [String(m._id), m]));

	// Map to output DTO
	const items: LowStockItemOutput[] = inventoryItems.map((item) => {
		const medicine = medicineMap.get(String(item.medicineId));
		return {
			id: String(item._id),
			name: medicine?.name || "",
			currentStock: item.currentStock,
			reorderLevel: item.reorderLevel,
			deficit: item.reorderLevel - item.currentStock,
			lastDispensed: null, // Would need to query transactions for this
		};
	});

	logger.info(
		{ tenantId, count: items.length },
		"Low stock items retrieved successfully",
	);

	return {
		items,
		count: items.length,
	};
}

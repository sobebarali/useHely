import { INVENTORY_DEFAULTS, StockStatus } from "../../../constants";
import { createServiceLogger } from "../../../lib/logger";
import {
	getInventorySummary,
	listInventory,
} from "../repositories/list.inventory.repository";
import {
	calculateStockStatus,
	findMedicinesByIds,
	searchMedicineIds,
} from "../repositories/shared.inventory.repository";
import type {
	InventoryItemSummary,
	ListInventoryInput,
	ListInventoryOutput,
} from "../validations/list.inventory.validation";

const logger = createServiceLogger("listInventory");

/**
 * List inventory items with filters and pagination
 */
export async function listInventoryService({
	tenantId,
	page: pageParam,
	limit: limitParam,
	search,
	category,
	status,
	expiringWithin,
	sortBy: sortByParam,
	sortOrder: sortOrderParam,
}: {
	tenantId: string;
} & ListInventoryInput): Promise<ListInventoryOutput> {
	logger.info(
		{ tenantId, page: pageParam, limit: limitParam },
		"Listing inventory",
	);

	const page = Number(pageParam) || 1;
	const limit = Number(limitParam) || INVENTORY_DEFAULTS.PAGE_LIMIT;
	const sortBy = sortByParam || "name";
	const sortOrder = sortOrderParam || "asc";

	// If search or category is provided, first find matching medicines via repository
	let medicineIds: string[] | undefined;
	if (search || category) {
		medicineIds = await searchMedicineIds({ tenantId, search, category });

		// If no medicines match the search/category, return empty results
		if (medicineIds.length === 0) {
			const summary = await getInventorySummary({ tenantId });
			return {
				data: [],
				pagination: {
					page,
					limit,
					total: 0,
					totalPages: 0,
				},
				summary,
			};
		}
	}

	// Get inventory items and summary in parallel
	const [result, summary] = await Promise.all([
		listInventory({
			tenantId,
			page,
			limit,
			status,
			expiringWithin,
			sortBy,
			sortOrder,
			medicineIds,
		}),
		getInventorySummary({ tenantId }),
	]);

	// Get medicine details for inventory items
	const inventoryMedicineIds = result.inventoryItems.map((item) =>
		String(item.medicineId),
	);
	const medicines = await findMedicinesByIds({
		tenantId,
		medicineIds: inventoryMedicineIds,
	});
	const medicineMap = new Map(medicines.map((m) => [String(m._id), m]));

	// Map to output DTO
	const data: InventoryItemSummary[] = result.inventoryItems.map((item) => {
		const medicine = medicineMap.get(String(item.medicineId));

		// Find earliest expiry date from batches
		let earliestExpiry: Date | null = null;
		if (item.batches && item.batches.length > 0) {
			const validBatches = item.batches.filter((b) => b.quantity > 0);
			if (validBatches.length > 0) {
				earliestExpiry = validBatches.reduce(
					(earliest, batch) => {
						const batchExpiry = new Date(batch.expiryDate);
						return !earliest || batchExpiry < earliest ? batchExpiry : earliest;
					},
					null as Date | null,
				);
			}
		}

		// Calculate stock status
		const stockStatus = calculateStockStatus(
			item.currentStock,
			item.reorderLevel,
		);

		// Check if expiring soon (within configured days)
		const expiryAlertDate = new Date();
		expiryAlertDate.setDate(
			expiryAlertDate.getDate() + INVENTORY_DEFAULTS.EXPIRY_ALERT_DAYS,
		);
		const isExpiringSoon = earliestExpiry && earliestExpiry <= expiryAlertDate;
		const finalStatus =
			isExpiringSoon && item.currentStock > 0
				? StockStatus.EXPIRING
				: stockStatus;

		return {
			id: String(item._id),
			medicineId: String(item.medicineId),
			name: medicine?.name || "",
			genericName: medicine?.genericName || "",
			code: medicine?.code || "",
			category: medicine?.category || "",
			currentStock: item.currentStock,
			reorderLevel: item.reorderLevel,
			unit: medicine?.unit || "",
			status: finalStatus,
			lastRestocked: item.lastRestocked?.toISOString() || null,
			expiryDate: earliestExpiry?.toISOString() || null,
		};
	});

	logger.info(
		{
			tenantId,
			page,
			limit,
			total: result.total,
		},
		"Inventory listed successfully",
	);

	return {
		data,
		pagination: {
			page: result.page,
			limit: result.limit,
			total: result.total,
			totalPages: result.totalPages,
		},
		summary,
	};
}

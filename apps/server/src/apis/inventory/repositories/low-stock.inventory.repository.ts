import { Inventory } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { InventoryLean } from "./shared.inventory.repository";

const logger = createRepositoryLogger("lowStockInventory");

interface LowStockParams {
	tenantId: string;
	limit: number;
	medicineIds?: string[];
	includeOutOfStock?: boolean;
}

/**
 * Get items with stock at or below reorder level.
 * By default includes out-of-stock items (currentStock = 0) as they are
 * the highest priority for reordering.
 */
export async function getLowStockItems({
	tenantId,
	limit,
	medicineIds,
	includeOutOfStock = true,
}: LowStockParams): Promise<InventoryLean[]> {
	try {
		logger.debug(
			{ tenantId, limit, includeOutOfStock },
			"Getting low stock items",
		);

		const query: Record<string, unknown> = {
			tenantId,
			$expr: {
				$lte: ["$currentStock", "$reorderLevel"],
			},
		};

		// Optionally exclude out-of-stock items
		if (!includeOutOfStock) {
			query.$expr = {
				$and: [
					{ $gt: ["$currentStock", 0] },
					{ $lte: ["$currentStock", "$reorderLevel"] },
				],
			};
		}

		if (medicineIds && medicineIds.length > 0) {
			query.medicineId = { $in: medicineIds };
		}

		const items = await Inventory.find(query)
			.sort({ currentStock: 1 })
			.limit(limit)
			.lean();

		logDatabaseOperation(
			logger,
			"find",
			"inventory",
			{ tenantId, limit },
			{ found: items.length },
		);

		return items as unknown as InventoryLean[];
	} catch (error) {
		logError(logger, error, "Failed to get low stock items");
		throw error;
	}
}

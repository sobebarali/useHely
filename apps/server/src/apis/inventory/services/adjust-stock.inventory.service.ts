import { BadRequestError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { adjustStock } from "../repositories/adjust-stock.inventory.repository";
import {
	findInventoryById,
	generateTransactionId,
} from "../repositories/shared.inventory.repository";
import type {
	AdjustStockInventoryBody,
	AdjustStockInventoryOutput,
	AdjustStockInventoryParams,
} from "../validations/adjust-stock.inventory.validation";

const logger = createServiceLogger("adjustStockInventory");

/**
 * Adjust stock for corrections, damage, or expiry
 */
export async function adjustStockInventoryService({
	tenantId,
	userId,
	id,
	adjustment,
	reason,
	batchNumber,
	notes,
}: {
	tenantId: string;
	userId: string;
} & AdjustStockInventoryParams &
	AdjustStockInventoryBody): Promise<AdjustStockInventoryOutput> {
	logger.info(
		{ tenantId, inventoryId: id, adjustment, reason },
		"Adjusting stock",
	);

	// Validate inventory exists
	const inventory = await findInventoryById({ tenantId, inventoryId: id });

	if (!inventory) {
		throw new NotFoundError("Inventory item not found", "NOT_FOUND");
	}

	// Validate would not go below zero
	const newStock = inventory.currentStock + adjustment;
	if (newStock < 0) {
		throw new BadRequestError(
			`Cannot reduce stock by ${Math.abs(adjustment)}. Current stock is ${inventory.currentStock}`,
			"INSUFFICIENT_STOCK",
		);
	}

	// Generate transaction ID
	const transactionId = await generateTransactionId({ tenantId });

	// Adjust stock
	const result = await adjustStock({
		tenantId,
		inventoryId: id,
		adjustment,
		reason,
		batchNumber,
		notes,
		performedBy: userId,
		transactionId,
	});

	logger.info(
		{
			tenantId,
			inventoryId: id,
			previousStock: result.previousStock,
			adjustment,
			newStock: result.inventory.currentStock,
			reason,
			transactionId,
		},
		"Stock adjusted successfully",
	);

	return {
		id: String(result.inventory._id),
		previousStock: result.previousStock,
		adjustment,
		currentStock: result.inventory.currentStock,
		reason,
		transactionId,
	};
}

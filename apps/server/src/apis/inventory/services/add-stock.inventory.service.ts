import { BadRequestError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { addStock } from "../repositories/add-stock.inventory.repository";
import {
	findInventoryById,
	generateTransactionId,
} from "../repositories/shared.inventory.repository";
import type {
	AddStockInventoryBody,
	AddStockInventoryOutput,
	AddStockInventoryParams,
} from "../validations/add-stock.inventory.validation";

const logger = createServiceLogger("addStockInventory");

/**
 * Add stock to inventory item
 */
export async function addStockInventoryService({
	tenantId,
	userId,
	id,
	quantity,
	batchNumber,
	expiryDate,
	purchasePrice,
	supplier,
	invoiceNumber,
}: {
	tenantId: string;
	userId: string;
} & AddStockInventoryParams &
	AddStockInventoryBody): Promise<AddStockInventoryOutput> {
	logger.info(
		{ tenantId, inventoryId: id, quantity, batchNumber },
		"Adding stock to inventory",
	);

	// Validate inventory exists
	const inventory = await findInventoryById({ tenantId, inventoryId: id });

	if (!inventory) {
		throw new NotFoundError("Inventory item not found", "NOT_FOUND");
	}

	// Validate expiry date is in the future
	const expiryDateObj = new Date(expiryDate);
	if (expiryDateObj <= new Date()) {
		throw new BadRequestError(
			"Expiry date must be in the future",
			"INVALID_EXPIRY",
		);
	}

	// Validate would not exceed max stock if set
	if (inventory.maxStock) {
		const newStock = inventory.currentStock + quantity;
		if (newStock > inventory.maxStock) {
			throw new BadRequestError(
				`Adding ${quantity} would exceed maximum stock level of ${inventory.maxStock}`,
				"EXCEEDS_MAX_STOCK",
			);
		}
	}

	// Generate transaction ID
	const transactionId = await generateTransactionId({ tenantId });

	// Add stock
	const result = await addStock({
		tenantId,
		inventoryId: id,
		quantity,
		batchNumber,
		expiryDate: expiryDateObj,
		purchasePrice,
		supplier,
		performedBy: userId,
		transactionId,
		reference: invoiceNumber,
	});

	logger.info(
		{
			tenantId,
			inventoryId: id,
			previousStock: result.previousStock,
			addedQuantity: quantity,
			newStock: result.inventory.currentStock,
			transactionId,
		},
		"Stock added successfully",
	);

	// Find the new batch
	const newBatch = result.inventory.batches.find(
		(b) => b.batchNumber === batchNumber,
	);

	return {
		id: String(result.inventory._id),
		previousStock: result.previousStock,
		addedQuantity: quantity,
		currentStock: result.inventory.currentStock,
		batch: {
			batchNumber,
			quantity,
			expiryDate: expiryDateObj.toISOString(),
			receivedDate:
				newBatch?.receivedDate.toISOString() || new Date().toISOString(),
			supplier: supplier || null,
		},
		transactionId,
	};
}

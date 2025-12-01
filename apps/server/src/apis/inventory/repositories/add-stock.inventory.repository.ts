import { Inventory, InventoryTransaction } from "@hms/db";
import { INVENTORY_ERRORS } from "../../../constants";
import { NotFoundError } from "../../../errors";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { InventoryLean } from "./shared.inventory.repository";

const logger = createRepositoryLogger("addStockInventory");

interface AddStockResult {
	inventory: InventoryLean;
	previousStock: number;
}

/**
 * Add stock to inventory item with a new batch.
 * Uses atomic operations to prevent race conditions.
 * Handles duplicate batch numbers by updating existing batch quantity.
 */
export async function addStock({
	tenantId,
	inventoryId,
	quantity,
	batchNumber,
	expiryDate,
	purchasePrice,
	supplier,
	performedBy,
	transactionId,
	reference,
}: {
	tenantId: string;
	inventoryId: string;
	quantity: number;
	batchNumber: string;
	expiryDate: Date;
	purchasePrice?: number;
	supplier?: string;
	performedBy: string;
	transactionId: string;
	reference?: string;
}): Promise<AddStockResult> {
	try {
		logger.debug(
			{ tenantId, inventoryId, quantity, batchNumber },
			"Adding stock to inventory",
		);

		const now = new Date();

		// Check if batch already exists and update atomically
		const existingBatchResult = await Inventory.findOneAndUpdate(
			{
				_id: inventoryId,
				tenantId,
				"batches.batchNumber": batchNumber,
			},
			{
				$inc: {
					currentStock: quantity,
					"batches.$.quantity": quantity,
				},
				$set: { lastRestocked: now, updatedAt: now },
			},
			{ new: false }, // Return pre-update document to get previousStock
		).lean();

		let previousStock: number;
		let updatedInventory: InventoryLean;

		if (existingBatchResult) {
			// Batch existed, was updated atomically
			previousStock = existingBatchResult.currentStock;
			// Fetch updated inventory
			const updated = await Inventory.findOne({
				_id: inventoryId,
				tenantId,
			}).lean();

			if (!updated) {
				throw new NotFoundError(
					"INVENTORY_NOT_FOUND",
					INVENTORY_ERRORS.NOT_FOUND,
				);
			}
			updatedInventory = updated as unknown as InventoryLean;
		} else {
			// Batch doesn't exist, add new batch atomically
			const newBatch = {
				batchNumber,
				quantity,
				expiryDate,
				purchasePrice,
				receivedDate: now,
				supplier,
			};

			// Use findOneAndUpdate with new: false to get previous state atomically
			const preUpdateInventory = await Inventory.findOneAndUpdate(
				{ _id: inventoryId, tenantId },
				{
					$inc: { currentStock: quantity },
					$push: { batches: newBatch },
					$set: { lastRestocked: now, updatedAt: now },
				},
				{ new: false },
			).lean();

			if (!preUpdateInventory) {
				throw new NotFoundError(
					"INVENTORY_NOT_FOUND",
					INVENTORY_ERRORS.NOT_FOUND,
				);
			}

			previousStock = preUpdateInventory.currentStock;

			// Fetch updated inventory
			const updated = await Inventory.findOne({
				_id: inventoryId,
				tenantId,
			}).lean();

			if (!updated) {
				throw new NotFoundError(
					"INVENTORY_NOT_FOUND",
					INVENTORY_ERRORS.NOT_FOUND,
				);
			}
			updatedInventory = updated as unknown as InventoryLean;
		}

		// Create transaction record
		await InventoryTransaction.create({
			_id: transactionId,
			tenantId,
			inventoryId,
			type: "RECEIPT",
			quantity,
			batchNumber,
			reference,
			performedBy,
			performedAt: now,
			createdAt: now,
		});

		logDatabaseOperation(
			logger,
			"update",
			"inventory",
			{ tenantId, inventoryId, quantity },
			{
				previousStock,
				newStock: updatedInventory.currentStock,
				transactionId,
			},
		);

		return {
			inventory: updatedInventory,
			previousStock,
		};
	} catch (error) {
		logError(logger, error, "Failed to add stock");
		throw error;
	}
}

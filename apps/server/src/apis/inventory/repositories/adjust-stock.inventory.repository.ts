import { Inventory, InventoryTransaction } from "@hms/db";
import { INVENTORY_ERRORS } from "../../../constants";
import { BadRequestError, NotFoundError } from "../../../errors";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { InventoryLean } from "./shared.inventory.repository";

const logger = createRepositoryLogger("adjustStockInventory");

interface AdjustStockParams {
	tenantId: string;
	inventoryId: string;
	adjustment: number;
	reason: string;
	batchNumber?: string;
	notes?: string;
	performedBy: string;
	transactionId: string;
}

interface AdjustStockResult {
	inventory: InventoryLean;
	previousStock: number;
}

/**
 * Adjust stock for corrections, damage, or expiry.
 * Uses atomic operations to prevent race conditions.
 * Handles both positive and negative adjustments for batches.
 */
export async function adjustStock({
	tenantId,
	inventoryId,
	adjustment,
	reason,
	batchNumber,
	notes,
	performedBy,
	transactionId,
}: AdjustStockParams): Promise<AdjustStockResult> {
	try {
		logger.debug(
			{ tenantId, inventoryId, adjustment, reason },
			"Adjusting stock",
		);

		const now = new Date();

		// For negative adjustments, we need to verify stock won't go below zero
		// Use findOneAndUpdate with a condition to ensure atomic check-and-update
		const updateCondition: Record<string, unknown> = {
			_id: inventoryId,
			tenantId,
		};

		// If negative adjustment, ensure currentStock >= |adjustment|
		if (adjustment < 0) {
			updateCondition.currentStock = { $gte: Math.abs(adjustment) };
		}

		// Perform atomic update, getting pre-update document
		const preUpdateInventory = await Inventory.findOneAndUpdate(
			updateCondition,
			{
				$inc: { currentStock: adjustment },
				$set: { updatedAt: now },
			},
			{ new: false },
		).lean();

		if (!preUpdateInventory) {
			// Check if inventory exists at all
			const inventoryExists = await Inventory.findOne({
				_id: inventoryId,
				tenantId,
			}).lean();

			if (!inventoryExists) {
				throw new NotFoundError(
					"INVENTORY_NOT_FOUND",
					INVENTORY_ERRORS.NOT_FOUND,
				);
			}

			// Inventory exists but condition failed - stock would go below zero
			throw new BadRequestError(
				"STOCK_BELOW_ZERO",
				INVENTORY_ERRORS.STOCK_BELOW_ZERO,
			);
		}

		const previousStock = preUpdateInventory.currentStock;

		// If batch-specific adjustment, also update batch quantity atomically
		if (batchNumber) {
			await Inventory.updateOne(
				{
					_id: inventoryId,
					tenantId,
					"batches.batchNumber": batchNumber,
				},
				{
					$inc: { "batches.$.quantity": adjustment },
				},
			);
		}

		// Fetch updated inventory
		const updatedInventory = await Inventory.findOne({
			_id: inventoryId,
			tenantId,
		}).lean();

		if (!updatedInventory) {
			throw new NotFoundError(
				"INVENTORY_NOT_FOUND",
				INVENTORY_ERRORS.NOT_FOUND,
			);
		}

		// Create transaction record
		await InventoryTransaction.create({
			_id: transactionId,
			tenantId,
			inventoryId,
			type: "ADJUSTMENT",
			quantity: adjustment,
			batchNumber,
			reason: `${reason}${notes ? `: ${notes}` : ""}`,
			performedBy,
			performedAt: now,
			createdAt: now,
		});

		logDatabaseOperation(
			logger,
			"update",
			"inventory",
			{ tenantId, inventoryId, adjustment, reason },
			{
				previousStock,
				newStock: updatedInventory.currentStock,
				transactionId,
			},
		);

		return {
			inventory: updatedInventory as unknown as InventoryLean,
			previousStock,
		};
	} catch (error) {
		logError(logger, error, "Failed to adjust stock");
		throw error;
	}
}

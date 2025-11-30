import { Counter, Inventory, Medicine } from "@hms/db";
import { StockStatus, type StockStatusType } from "../../../constants";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import { escapeRegex } from "../../../utils/crypto";

const logger = createRepositoryLogger("sharedInventory");

// TypeScript interfaces for lean documents
export interface BatchLean {
	_id: string;
	batchNumber: string;
	quantity: number;
	expiryDate: Date;
	purchasePrice?: number;
	receivedDate: Date;
	supplier?: string;
}

export interface InventoryLean {
	_id: string;
	tenantId: string;
	medicineId: string;
	currentStock: number;
	reorderLevel: number;
	maxStock?: number;
	location?: string;
	batches: BatchLean[];
	lastRestocked?: Date;
	createdAt: Date;
	updatedAt: Date;
}

export interface MedicineLean {
	_id: string;
	tenantId: string;
	name: string;
	genericName?: string;
	code: string;
	category: string;
	type: string;
	manufacturer?: string;
	strength?: string;
	unit: string;
	description?: string;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Find inventory item by ID within a tenant
 */
export async function findInventoryById({
	tenantId,
	inventoryId,
}: {
	tenantId: string;
	inventoryId: string;
}): Promise<InventoryLean | null> {
	try {
		logger.debug({ tenantId, inventoryId }, "Finding inventory by ID");

		const inventory = await Inventory.findOne({
			_id: inventoryId,
			tenantId,
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"inventory",
			{ tenantId, inventoryId },
			inventory ? { _id: inventory._id, found: true } : { found: false },
		);

		return inventory as InventoryLean | null;
	} catch (error) {
		logError(logger, error, "Failed to find inventory by ID");
		throw error;
	}
}

/**
 * Find inventory item by medicine ID within a tenant
 */
export async function findInventoryByMedicineId({
	tenantId,
	medicineId,
}: {
	tenantId: string;
	medicineId: string;
}): Promise<InventoryLean | null> {
	try {
		logger.debug({ tenantId, medicineId }, "Finding inventory by medicine ID");

		const inventory = await Inventory.findOne({
			tenantId,
			medicineId,
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"inventory",
			{ tenantId, medicineId },
			inventory ? { _id: inventory._id, found: true } : { found: false },
		);

		return inventory as InventoryLean | null;
	} catch (error) {
		logError(logger, error, "Failed to find inventory by medicine ID");
		throw error;
	}
}

/**
 * Find multiple inventory items by IDs within a tenant
 */
export async function findInventoryByIds({
	tenantId,
	inventoryIds,
}: {
	tenantId: string;
	inventoryIds: string[];
}): Promise<InventoryLean[]> {
	try {
		logger.debug(
			{ tenantId, count: inventoryIds.length },
			"Finding inventory items by IDs",
		);

		const inventoryItems = await Inventory.find({
			_id: { $in: inventoryIds },
			tenantId,
		}).lean();

		logDatabaseOperation(
			logger,
			"find",
			"inventory",
			{ tenantId, count: inventoryIds.length },
			{ found: inventoryItems.length },
		);

		return inventoryItems as unknown as InventoryLean[];
	} catch (error) {
		logError(logger, error, "Failed to find inventory items by IDs");
		throw error;
	}
}

/**
 * Generate next inventory ID for a tenant
 * Format: {tenantId}-INV-{sequential}
 */
export async function generateInventoryId({
	tenantId,
}: {
	tenantId: string;
}): Promise<string> {
	try {
		logger.debug({ tenantId }, "Generating inventory ID");

		const counter = await Counter.findOneAndUpdate(
			{ tenantId, type: "inventory" },
			{ $inc: { seq: 1 } },
			{ new: true, upsert: true },
		);

		const seq = counter?.seq || 1;
		const inventoryId = `${tenantId}-INV-${String(seq).padStart(6, "0")}`;

		logDatabaseOperation(
			logger,
			"generateId",
			"counter",
			{ tenantId, type: "inventory" },
			{ inventoryId, seq },
		);

		return inventoryId;
	} catch (error) {
		logError(logger, error, "Failed to generate inventory ID");
		throw error;
	}
}

/**
 * Generate next inventory transaction ID for a tenant
 * Format: {tenantId}-TXN-{sequential}
 */
export async function generateTransactionId({
	tenantId,
}: {
	tenantId: string;
}): Promise<string> {
	try {
		logger.debug({ tenantId }, "Generating transaction ID");

		const counter = await Counter.findOneAndUpdate(
			{ tenantId, type: "inventory_transaction" },
			{ $inc: { seq: 1 } },
			{ new: true, upsert: true },
		);

		const seq = counter?.seq || 1;
		const transactionId = `${tenantId}-TXN-${String(seq).padStart(6, "0")}`;

		logDatabaseOperation(
			logger,
			"generateId",
			"counter",
			{ tenantId, type: "inventory_transaction" },
			{ transactionId, seq },
		);

		return transactionId;
	} catch (error) {
		logError(logger, error, "Failed to generate transaction ID");
		throw error;
	}
}

/**
 * Find medicine by ID within a tenant
 */
export async function findMedicineById({
	tenantId,
	medicineId,
}: {
	tenantId: string;
	medicineId: string;
}): Promise<MedicineLean | null> {
	try {
		logger.debug({ tenantId, medicineId }, "Finding medicine by ID");

		const medicine = await Medicine.findOne({
			_id: medicineId,
			tenantId,
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"medicine",
			{ tenantId, medicineId },
			medicine ? { _id: medicine._id, found: true } : { found: false },
		);

		return medicine as MedicineLean | null;
	} catch (error) {
		logError(logger, error, "Failed to find medicine by ID");
		throw error;
	}
}

/**
 * Find medicine by code within a tenant
 */
export async function findMedicineByCode({
	tenantId,
	code,
}: {
	tenantId: string;
	code: string;
}): Promise<MedicineLean | null> {
	try {
		logger.debug({ tenantId, code }, "Finding medicine by code");

		const medicine = await Medicine.findOne({
			tenantId,
			code,
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"medicine",
			{ tenantId, code },
			medicine ? { _id: medicine._id, found: true } : { found: false },
		);

		return medicine as MedicineLean | null;
	} catch (error) {
		logError(logger, error, "Failed to find medicine by code");
		throw error;
	}
}

/**
 * Find multiple medicines by IDs within a tenant
 */
export async function findMedicinesByIds({
	tenantId,
	medicineIds,
}: {
	tenantId: string;
	medicineIds: string[];
}): Promise<MedicineLean[]> {
	try {
		logger.debug(
			{ tenantId, count: medicineIds.length },
			"Finding medicines by IDs",
		);

		const medicines = await Medicine.find({
			_id: { $in: medicineIds },
			tenantId,
		}).lean();

		logDatabaseOperation(
			logger,
			"find",
			"medicine",
			{ tenantId, count: medicineIds.length },
			{ found: medicines.length },
		);

		return medicines as MedicineLean[];
	} catch (error) {
		logError(logger, error, "Failed to find medicines by IDs");
		throw error;
	}
}

/**
 * Generate next medicine ID for a tenant
 * Format: {tenantId}-MED-{sequential}
 */
export async function generateMedicineId({
	tenantId,
}: {
	tenantId: string;
}): Promise<string> {
	try {
		logger.debug({ tenantId }, "Generating medicine ID");

		const counter = await Counter.findOneAndUpdate(
			{ tenantId, type: "medicine" },
			{ $inc: { seq: 1 } },
			{ new: true, upsert: true },
		);

		const seq = counter?.seq || 1;
		const medicineId = `${tenantId}-MED-${String(seq).padStart(6, "0")}`;

		logDatabaseOperation(
			logger,
			"generateId",
			"counter",
			{ tenantId, type: "medicine" },
			{ medicineId, seq },
		);

		return medicineId;
	} catch (error) {
		logError(logger, error, "Failed to generate medicine ID");
		throw error;
	}
}

/**
 * Calculate stock status based on current stock and reorder level
 */
export function calculateStockStatus(
	currentStock: number,
	reorderLevel: number,
): StockStatusType {
	if (currentStock === 0) return StockStatus.OUT_OF_STOCK;
	if (currentStock <= reorderLevel) return StockStatus.LOW_STOCK;
	return StockStatus.IN_STOCK;
}

/**
 * Search medicines by name, generic name, or code with optional category filter.
 * Returns only medicine IDs for use in inventory filtering.
 * Search input is sanitized to prevent ReDoS attacks.
 */
export async function searchMedicineIds({
	tenantId,
	search,
	category,
}: {
	tenantId: string;
	search?: string;
	category?: string;
}): Promise<string[]> {
	try {
		logger.debug({ tenantId, search, category }, "Searching medicine IDs");

		const query: Record<string, unknown> = { tenantId, isActive: true };

		if (search) {
			// Escape regex special characters to prevent ReDoS
			const escapedSearch = escapeRegex(search);
			query.$or = [
				{ name: { $regex: escapedSearch, $options: "i" } },
				{ genericName: { $regex: escapedSearch, $options: "i" } },
				{ code: { $regex: escapedSearch, $options: "i" } },
			];
		}

		if (category) {
			query.category = category;
		}

		const medicines = await Medicine.find(query).select("_id").lean();

		logDatabaseOperation(
			logger,
			"find",
			"medicine",
			{ tenantId, search, category },
			{ found: medicines.length },
		);

		return medicines.map((m) => String(m._id));
	} catch (error) {
		logError(logger, error, "Failed to search medicine IDs");
		throw error;
	}
}

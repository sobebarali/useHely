import { Inventory } from "@hms/db";
import { INVENTORY_DEFAULTS } from "../../../constants";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { InventoryLean } from "./shared.inventory.repository";

const logger = createRepositoryLogger("listInventory");

interface ListInventoryParams {
	tenantId: string;
	page: number;
	limit: number;
	search?: string;
	category?: string;
	status?: string;
	expiringWithin?: number;
	sortBy: string;
	sortOrder: string;
	medicineIds?: string[];
}

interface ListInventoryResult {
	inventoryItems: InventoryLean[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

interface InventorySummaryResult {
	totalItems: number;
	inStock: number;
	lowStock: number;
	outOfStock: number;
	expiringSoon: number;
}

/**
 * List inventory items with filters and pagination
 */
export async function listInventory({
	tenantId,
	page,
	limit,
	status,
	expiringWithin,
	sortBy,
	sortOrder,
	medicineIds,
}: ListInventoryParams): Promise<ListInventoryResult> {
	try {
		logger.debug({ tenantId, page, limit }, "Listing inventory");

		// Build query
		const query: Record<string, unknown> = { tenantId };

		// Filter by medicine IDs (from search)
		if (medicineIds && medicineIds.length > 0) {
			query.medicineId = { $in: medicineIds };
		}

		// Status-based filtering
		if (status === "OUT_OF_STOCK") {
			query.currentStock = 0;
		} else if (status === "LOW_STOCK") {
			query.$expr = {
				$and: [
					{ $gt: ["$currentStock", 0] },
					{ $lte: ["$currentStock", "$reorderLevel"] },
				],
			};
		} else if (status === "IN_STOCK") {
			query.$expr = { $gt: ["$currentStock", "$reorderLevel"] };
		} else if (status === "EXPIRING" || expiringWithin) {
			const days = expiringWithin || INVENTORY_DEFAULTS.EXPIRY_ALERT_DAYS;
			const expiryThreshold = new Date();
			expiryThreshold.setDate(expiryThreshold.getDate() + days);
			query["batches.expiryDate"] = { $lte: expiryThreshold };
		}

		// Build sort - note: sorting by medicine name requires aggregation
		const sort: Record<string, 1 | -1> = {};
		if (
			sortBy === "name" ||
			sortBy === "currentStock" ||
			sortBy === "lastRestocked"
		) {
			sort[sortBy === "name" ? "medicineId" : sortBy] =
				sortOrder === "asc" ? 1 : -1;
		} else {
			sort.createdAt = sortOrder === "asc" ? 1 : -1;
		}

		// Execute query with pagination
		const skip = (page - 1) * limit;

		const [inventoryItems, total] = await Promise.all([
			Inventory.find(query).sort(sort).skip(skip).limit(limit).lean(),
			Inventory.countDocuments(query),
		]);

		logDatabaseOperation(
			logger,
			"find",
			"inventory",
			{ tenantId, page, limit },
			{ found: inventoryItems.length, total },
		);

		return {
			inventoryItems: inventoryItems as unknown as InventoryLean[],
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	} catch (error) {
		logError(logger, error, "Failed to list inventory");
		throw error;
	}
}

/**
 * Get inventory summary statistics using $facet for efficient single-query aggregation
 */
export async function getInventorySummary({
	tenantId,
}: {
	tenantId: string;
}): Promise<InventorySummaryResult> {
	try {
		logger.debug({ tenantId }, "Getting inventory summary");

		const expiryAlertDate = new Date();
		expiryAlertDate.setDate(
			expiryAlertDate.getDate() + INVENTORY_DEFAULTS.EXPIRY_ALERT_DAYS,
		);

		// Use $facet to compute all stats in a single aggregation query
		const [result] = await Inventory.aggregate([
			{ $match: { tenantId } },
			{
				$facet: {
					total: [{ $count: "count" }],
					outOfStock: [{ $match: { currentStock: 0 } }, { $count: "count" }],
					lowStock: [
						{
							$match: {
								$expr: {
									$and: [
										{ $gt: ["$currentStock", 0] },
										{ $lte: ["$currentStock", "$reorderLevel"] },
									],
								},
							},
						},
						{ $count: "count" },
					],
					expiringSoon: [
						{
							$match: {
								"batches.expiryDate": { $lte: expiryAlertDate },
								currentStock: { $gt: 0 },
							},
						},
						{ $count: "count" },
					],
				},
			},
		]);

		// Extract counts from facet results (default to 0 if empty)
		const totalItems = result?.total?.[0]?.count || 0;
		const outOfStock = result?.outOfStock?.[0]?.count || 0;
		const lowStock = result?.lowStock?.[0]?.count || 0;
		const expiringSoon = result?.expiringSoon?.[0]?.count || 0;
		const inStock = Math.max(0, totalItems - outOfStock - lowStock);

		logDatabaseOperation(
			logger,
			"aggregate",
			"inventory",
			{ tenantId },
			{ totalItems, inStock, lowStock, outOfStock, expiringSoon },
		);

		return {
			totalItems,
			inStock,
			lowStock,
			outOfStock,
			expiringSoon,
		};
	} catch (error) {
		logError(logger, error, "Failed to get inventory summary");
		throw error;
	}
}

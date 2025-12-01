import { Inventory } from "@hms/db";
import { INVENTORY_DEFAULTS } from "../../../constants";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { InventoryLean } from "./shared.inventory.repository";

const logger = createRepositoryLogger("listInventory");

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
}: {
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
}): Promise<ListInventoryResult> {
	try {
		logger.debug({ tenantId, page, limit }, "Listing inventory");

		// Build match query
		const matchQuery: Record<string, unknown> = { tenantId };

		// Filter by medicine IDs (from search)
		if (medicineIds && medicineIds.length > 0) {
			matchQuery.medicineId = { $in: medicineIds };
		}

		// Status-based filtering
		if (status === "OUT_OF_STOCK") {
			matchQuery.currentStock = 0;
		} else if (status === "LOW_STOCK") {
			matchQuery.$expr = {
				$and: [
					{ $gt: ["$currentStock", 0] },
					{ $lte: ["$currentStock", "$reorderLevel"] },
				],
			};
		} else if (status === "IN_STOCK") {
			matchQuery.$expr = { $gt: ["$currentStock", "$reorderLevel"] };
		} else if (status === "EXPIRING" || expiringWithin) {
			const days = expiringWithin || INVENTORY_DEFAULTS.EXPIRY_ALERT_DAYS;
			const expiryThreshold = new Date();
			expiryThreshold.setDate(expiryThreshold.getDate() + days);
			matchQuery["batches.expiryDate"] = { $lte: expiryThreshold };
		}

		const skip = (page - 1) * limit;
		const sortDirection = sortOrder === "asc" ? 1 : -1;

		// Use aggregation when sorting by name to properly sort by medicine name
		if (sortBy === "name") {
			const pipeline = [
				{ $match: matchQuery },
				{
					$lookup: {
						from: "medicine",
						localField: "medicineId",
						foreignField: "_id",
						as: "medicine",
					},
				},
				{ $unwind: { path: "$medicine", preserveNullAndEmptyArrays: true } },
				{ $sort: { "medicine.name": sortDirection as 1 | -1 } },
				{ $skip: skip },
				{ $limit: limit },
				{
					$project: {
						medicine: 0, // Remove the joined medicine field
					},
				},
			];

			const [inventoryItems, countResult] = await Promise.all([
				Inventory.aggregate(pipeline),
				Inventory.countDocuments(matchQuery),
			]);

			logDatabaseOperation(
				logger,
				"aggregate",
				"inventory",
				{ tenantId, page, limit, sortBy },
				{ found: inventoryItems.length, total: countResult },
			);

			return {
				inventoryItems: inventoryItems as unknown as InventoryLean[],
				total: countResult,
				page,
				limit,
				totalPages: Math.ceil(countResult / limit),
			};
		}

		// For other sort fields, use simple find query
		const sort: Record<string, 1 | -1> = {};
		if (sortBy === "currentStock" || sortBy === "lastRestocked") {
			sort[sortBy] = sortDirection as 1 | -1;
		} else {
			sort.createdAt = sortDirection as 1 | -1;
		}

		const [inventoryItems, total] = await Promise.all([
			Inventory.find(matchQuery).sort(sort).skip(skip).limit(limit).lean(),
			Inventory.countDocuments(matchQuery),
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

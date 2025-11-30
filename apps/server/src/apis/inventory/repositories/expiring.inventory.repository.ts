import { Inventory } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("expiringInventory");

interface ExpiringBatch {
	inventoryId: string;
	medicineId: string;
	medicineName: string;
	batchNumber: string;
	quantity: number;
	expiryDate: Date;
}

interface ExpiringParams {
	tenantId: string;
	days: number;
	limit: number;
	skip?: number;
}

interface ExpiringResult {
	items: ExpiringBatch[];
	total: number;
}

/**
 * Get batches expiring within specified days.
 * Uses $lookup to join medicine data in a single aggregation query,
 * avoiding the N+1 query problem.
 * Supports pagination with skip parameter.
 */
export async function getExpiringItems({
	tenantId,
	days,
	limit,
	skip = 0,
}: ExpiringParams): Promise<ExpiringResult> {
	try {
		logger.debug({ tenantId, days, limit, skip }, "Getting expiring items");

		const expiryThreshold = new Date();
		expiryThreshold.setDate(expiryThreshold.getDate() + days);

		// Use aggregation with $lookup to join medicine data in a single query
		const pipeline = [
			{
				$match: {
					tenantId,
					currentStock: { $gt: 0 },
				},
			},
			{
				$unwind: "$batches",
			},
			{
				$match: {
					"batches.expiryDate": { $lte: expiryThreshold },
					"batches.quantity": { $gt: 0 },
				},
			},
			{
				$lookup: {
					from: "medicine",
					localField: "medicineId",
					foreignField: "_id",
					as: "medicine",
				},
			},
			{
				$unwind: {
					path: "$medicine",
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$sort: { "batches.expiryDate": 1 as const },
			},
			{
				$facet: {
					items: [
						{ $skip: skip },
						{ $limit: limit },
						{
							$project: {
								inventoryId: "$_id",
								medicineId: "$medicineId",
								medicineName: { $ifNull: ["$medicine.name", ""] },
								batchNumber: "$batches.batchNumber",
								quantity: "$batches.quantity",
								expiryDate: "$batches.expiryDate",
							},
						},
					],
					total: [{ $count: "count" }],
				},
			},
		];

		const [result] = await Inventory.aggregate(pipeline);

		const items = result?.items || [];
		const total = result?.total?.[0]?.count || 0;

		logDatabaseOperation(
			logger,
			"aggregate",
			"inventory",
			{ tenantId, days, limit, skip },
			{ found: items.length, total },
		);

		return { items, total };
	} catch (error) {
		logError(logger, error, "Failed to get expiring items");
		throw error;
	}
}

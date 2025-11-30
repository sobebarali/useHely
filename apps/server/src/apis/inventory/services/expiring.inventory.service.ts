import { INVENTORY_DEFAULTS } from "../../../constants";
import { createServiceLogger } from "../../../lib/logger";
import { getExpiringItems } from "../repositories/expiring.inventory.repository";
import type {
	ExpiringInventoryInput,
	ExpiringInventoryOutput,
	ExpiringItemOutput,
} from "../validations/expiring.inventory.validation";

const logger = createServiceLogger("expiringInventory");

/**
 * Get batches expiring within specified days.
 * Uses optimized aggregation with $lookup to avoid N+1 queries.
 */
export async function expiringInventoryService({
	tenantId,
	days: daysParam,
	limit: limitParam,
	page: pageParam,
}: {
	tenantId: string;
} & ExpiringInventoryInput): Promise<ExpiringInventoryOutput> {
	const days = Number(daysParam) || INVENTORY_DEFAULTS.EXPIRY_ALERT_DAYS;
	const limit = Number(limitParam) || INVENTORY_DEFAULTS.PAGE_LIMIT;
	const page = Number(pageParam) || 1;
	const skip = (page - 1) * limit;

	logger.info({ tenantId, days, limit, page }, "Getting expiring items");

	const result = await getExpiringItems({
		tenantId,
		days,
		limit,
		skip,
	});

	const expiringBatches = result.items;
	const total = result.total;

	// Calculate days until expiry
	const now = new Date();

	// Map to output DTO - medicine name is already included from $lookup
	const items: ExpiringItemOutput[] = expiringBatches.map(
		(batch: {
			inventoryId: string;
			medicineName: string;
			batchNumber: string;
			quantity: number;
			expiryDate: Date;
		}) => {
			const expiryDate = new Date(batch.expiryDate);
			const daysUntilExpiry = Math.ceil(
				(expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
			);

			return {
				id: batch.inventoryId,
				name: batch.medicineName,
				batchNumber: batch.batchNumber,
				quantity: batch.quantity,
				expiryDate: expiryDate.toISOString(),
				daysUntilExpiry: Math.max(0, daysUntilExpiry),
			};
		},
	);

	logger.info(
		{ tenantId, count: items.length, total },
		"Expiring items retrieved successfully",
	);

	return {
		items,
		count: items.length,
		total,
		page,
		totalPages: Math.ceil(total / limit),
	};
}

import { InventoryTransaction } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("transactionsInventory");

interface TransactionLean {
	_id: string;
	tenantId: string;
	inventoryId: string;
	type: string;
	quantity: number;
	batchNumber?: string;
	reference?: string;
	reason?: string;
	performedBy: string;
	performedAt: Date;
	createdAt: Date;
}

interface ListTransactionsResult {
	transactions: TransactionLean[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

/**
 * List inventory transactions with filters and pagination
 */
export async function listTransactions({
	tenantId,
	page,
	limit,
	itemId,
	type,
	startDate,
	endDate,
}: {
	tenantId: string;
	page: number;
	limit: number;
	itemId?: string;
	type?: string;
	startDate?: string;
	endDate?: string;
}): Promise<ListTransactionsResult> {
	try {
		logger.debug({ tenantId, page, limit }, "Listing transactions");

		const query: Record<string, unknown> = { tenantId };

		if (itemId) {
			query.inventoryId = itemId;
		}

		if (type) {
			query.type = type;
		}

		if (startDate || endDate) {
			query.performedAt = {};
			if (startDate) {
				(query.performedAt as Record<string, Date>).$gte = new Date(startDate);
			}
			if (endDate) {
				(query.performedAt as Record<string, Date>).$lte = new Date(endDate);
			}
		}

		const skip = (page - 1) * limit;

		const [transactions, total] = await Promise.all([
			InventoryTransaction.find(query)
				.sort({ performedAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			InventoryTransaction.countDocuments(query),
		]);

		logDatabaseOperation(
			logger,
			"find",
			"inventoryTransaction",
			{ tenantId, page, limit },
			{ found: transactions.length, total },
		);

		return {
			transactions: transactions as unknown as TransactionLean[],
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	} catch (error) {
		logError(logger, error, "Failed to list transactions");
		throw error;
	}
}

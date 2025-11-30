import { InventoryTransaction } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("getByIdInventory");

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

/**
 * Get recent transactions for an inventory item
 */
export async function getRecentTransactions({
	tenantId,
	inventoryId,
	limit = 10,
}: {
	tenantId: string;
	inventoryId: string;
	limit?: number;
}): Promise<TransactionLean[]> {
	try {
		logger.debug(
			{ tenantId, inventoryId, limit },
			"Getting recent transactions",
		);

		const transactions = await InventoryTransaction.find({
			tenantId,
			inventoryId,
		})
			.sort({ performedAt: -1 })
			.limit(limit)
			.lean();

		logDatabaseOperation(
			logger,
			"find",
			"inventoryTransaction",
			{ tenantId, inventoryId, limit },
			{ found: transactions.length },
		);

		return transactions as unknown as TransactionLean[];
	} catch (error) {
		logError(logger, error, "Failed to get recent transactions");
		throw error;
	}
}

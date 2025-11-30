import { BadRequestError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { findStaffByIds } from "../../users/repositories/shared.users.repository";
import {
	findInventoryByIds,
	findMedicinesByIds,
} from "../repositories/shared.inventory.repository";
import { listTransactions } from "../repositories/transactions.inventory.repository";
import type {
	TransactionItemOutput,
	TransactionsInventoryInput,
	TransactionsInventoryOutput,
} from "../validations/transactions.inventory.validation";

const logger = createServiceLogger("transactionsInventory");

/**
 * List inventory transactions
 */
export async function transactionsInventoryService({
	tenantId,
	page: pageParam,
	limit: limitParam,
	itemId,
	type,
	startDate,
	endDate,
}: {
	tenantId: string;
} & TransactionsInventoryInput): Promise<TransactionsInventoryOutput> {
	const page = Number(pageParam) || 1;
	const limit = Number(limitParam) || 50;

	logger.info({ tenantId, page, limit }, "Listing transactions");

	// Validate date range if provided
	if (startDate && endDate) {
		const start = new Date(startDate);
		const end = new Date(endDate);
		if (start > end) {
			throw new BadRequestError(
				"Start date must be before end date",
				"INVALID_DATE_RANGE",
			);
		}
	}

	const result = await listTransactions({
		tenantId,
		page,
		limit,
		itemId,
		type,
		startDate,
		endDate,
	});

	// Get inventory and medicine details
	const inventoryIds = [
		...new Set(result.transactions.map((t) => t.inventoryId)),
	];
	const inventoryItems = await findInventoryByIds({
		tenantId,
		inventoryIds,
	});
	const inventoryMap = new Map(inventoryItems.map((i) => [String(i._id), i]));

	const medicineIds = inventoryItems.map((i) => i.medicineId);
	const medicines = await findMedicinesByIds({ tenantId, medicineIds });
	const medicineMap = new Map(medicines.map((m) => [String(m._id), m]));

	// Get staff details
	const staffIds = [...new Set(result.transactions.map((t) => t.performedBy))];
	const staffMembers =
		staffIds.length > 0 ? await findStaffByIds({ tenantId, staffIds }) : [];
	const staffMap = new Map(staffMembers.map((s) => [String(s._id), s]));

	// Map to output DTO
	const data: TransactionItemOutput[] = result.transactions.map(
		(transaction) => {
			const inventory = inventoryMap.get(transaction.inventoryId);
			const medicine = inventory
				? medicineMap.get(inventory.medicineId)
				: undefined;
			const staff = staffMap.get(transaction.performedBy);

			return {
				id: String(transaction._id),
				inventoryId: transaction.inventoryId,
				medicineName: medicine?.name || "",
				type: transaction.type,
				quantity: transaction.quantity,
				batchNumber: transaction.batchNumber || null,
				reference: transaction.reference || null,
				reason: transaction.reason || null,
				performedBy: {
					id: transaction.performedBy,
					firstName: staff?.firstName || "",
					lastName: staff?.lastName || "",
				},
				performedAt: transaction.performedAt.toISOString(),
			};
		},
	);

	logger.info(
		{ tenantId, page, limit, total: result.total },
		"Transactions listed successfully",
	);

	return {
		data,
		pagination: {
			page: result.page,
			limit: result.limit,
			total: result.total,
			totalPages: result.totalPages,
		},
	};
}

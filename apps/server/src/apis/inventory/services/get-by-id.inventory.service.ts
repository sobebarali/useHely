import { NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { findStaffByIds } from "../../users/repositories/shared.users.repository";
import { getRecentTransactions } from "../repositories/get-by-id.inventory.repository";
import {
	calculateStockStatus,
	findInventoryById,
	findMedicineById,
} from "../repositories/shared.inventory.repository";
import type {
	GetByIdInventoryOutput,
	GetByIdInventoryParams,
} from "../validations/get-by-id.inventory.validation";

const logger = createServiceLogger("getByIdInventory");

/**
 * Get inventory item by ID with full details
 */
export async function getByIdInventoryService({
	tenantId,
	id,
}: {
	tenantId: string;
} & GetByIdInventoryParams): Promise<GetByIdInventoryOutput> {
	logger.info({ tenantId, inventoryId: id }, "Getting inventory item by ID");

	const inventory = await findInventoryById({ tenantId, inventoryId: id });

	if (!inventory) {
		throw new NotFoundError("Inventory item not found", "NOT_FOUND");
	}

	// Get medicine details
	const medicine = await findMedicineById({
		tenantId,
		medicineId: inventory.medicineId,
	});

	if (!medicine) {
		throw new NotFoundError("Medicine not found", "NOT_FOUND");
	}

	// Get recent transactions
	const transactions = await getRecentTransactions({
		tenantId,
		inventoryId: id,
		limit: 10,
	});

	// Get staff details for transactions
	const staffIds = [...new Set(transactions.map((t) => t.performedBy))];
	const staffMembers =
		staffIds.length > 0 ? await findStaffByIds({ tenantId, staffIds }) : [];
	const staffMap = new Map(staffMembers.map((s) => [String(s._id), s]));

	// Calculate stock status
	const status = calculateStockStatus(
		inventory.currentStock,
		inventory.reorderLevel,
	);

	logger.info(
		{ tenantId, inventoryId: id },
		"Inventory item retrieved successfully",
	);

	return {
		id: String(inventory._id),
		medicine: {
			id: String(medicine._id),
			name: medicine.name,
			genericName: medicine.genericName || "",
			code: medicine.code,
			category: medicine.category,
			type: medicine.type,
			manufacturer: medicine.manufacturer || null,
			strength: medicine.strength || null,
			unit: medicine.unit,
			description: medicine.description || null,
		},
		currentStock: inventory.currentStock,
		reorderLevel: inventory.reorderLevel,
		maxStock: inventory.maxStock || null,
		unit: medicine.unit,
		location: inventory.location || null,
		batches: inventory.batches.map((b) => ({
			batchNumber: b.batchNumber,
			quantity: b.quantity,
			expiryDate: b.expiryDate.toISOString(),
			receivedDate: b.receivedDate.toISOString(),
			supplier: b.supplier || null,
		})),
		transactions: transactions.map((t) => {
			const staff = staffMap.get(t.performedBy);
			return {
				type: t.type,
				quantity: t.quantity,
				reference: t.reference || null,
				performedBy: {
					id: t.performedBy,
					firstName: staff?.firstName || "",
					lastName: staff?.lastName || "",
				},
				performedAt: t.performedAt.toISOString(),
			};
		}),
		status,
	};
}

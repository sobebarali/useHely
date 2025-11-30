import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Enums
export const TransactionType = {
	RECEIPT: "RECEIPT",
	DISPENSING: "DISPENSING",
	ADJUSTMENT: "ADJUSTMENT",
	RETURN: "RETURN",
	TRANSFER: "TRANSFER",
} as const;

export const AdjustmentReason = {
	DAMAGE: "DAMAGE",
	EXPIRY: "EXPIRY",
	CORRECTION: "CORRECTION",
	LOSS: "LOSS",
	RETURN: "RETURN",
	OTHER: "OTHER",
} as const;

// Sub-schemas
const batchSchema = new Schema(
	{
		batchNumber: { type: String, required: true },
		quantity: { type: Number, required: true },
		expiryDate: { type: Date, required: true },
		purchasePrice: { type: Number },
		receivedDate: { type: Date, required: true },
		supplier: { type: String },
	},
	{ _id: true },
);

// Main Inventory schema
const inventorySchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Hospital", required: true },
		medicineId: { type: String, ref: "Medicine", required: true },
		currentStock: { type: Number, default: 0 },
		reorderLevel: { type: Number, default: 10 },
		maxStock: { type: Number },
		location: { type: String },
		batches: [{ type: batchSchema }],
		lastRestocked: { type: Date },
	},
	{
		collection: "inventory",
		timestamps: true,
	},
);

// Indexes
inventorySchema.index({ tenantId: 1, medicineId: 1 }, { unique: true });
inventorySchema.index({ tenantId: 1, currentStock: 1, reorderLevel: 1 });
inventorySchema.index({ tenantId: 1, "batches.expiryDate": 1 });

// Inventory Transaction schema
const inventoryTransactionSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Hospital", required: true },
		inventoryId: { type: String, ref: "Inventory", required: true },
		type: {
			type: String,
			enum: Object.values(TransactionType),
			required: true,
		},
		quantity: { type: Number, required: true },
		batchNumber: { type: String },
		reference: { type: String },
		reason: { type: String },
		performedBy: { type: String, ref: "Staff", required: true },
		performedAt: { type: Date, required: true },
	},
	{
		collection: "inventory_transaction",
		timestamps: { createdAt: true, updatedAt: false },
	},
);

// Indexes
inventoryTransactionSchema.index({
	tenantId: 1,
	inventoryId: 1,
	performedAt: -1,
});
inventoryTransactionSchema.index({ tenantId: 1, type: 1, performedAt: -1 });
inventoryTransactionSchema.index({ tenantId: 1, performedAt: -1 });

const Inventory = model("Inventory", inventorySchema);
const InventoryTransaction = model(
	"InventoryTransaction",
	inventoryTransactionSchema,
);

export { Inventory, InventoryTransaction };

import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Enums
export const DispensingStatus = {
	PENDING: "PENDING",
	DISPENSING: "DISPENSING",
	DISPENSED: "DISPENSED",
	COLLECTED: "COLLECTED",
	CANCELLED: "CANCELLED",
} as const;

export const MedicineDispensingStatus = {
	PENDING: "PENDING",
	DISPENSED: "DISPENSED",
	UNAVAILABLE: "UNAVAILABLE",
} as const;

// Sub-schemas
const dispensingMedicineSchema = new Schema(
	{
		medicineId: { type: String, required: true },
		dispensedQuantity: { type: Number, default: 0 },
		batchNumber: { type: String },
		expiryDate: { type: Date },
		substituted: { type: Boolean, default: false },
		substituteNote: { type: String },
		status: {
			type: String,
			enum: Object.values(MedicineDispensingStatus),
			default: MedicineDispensingStatus.PENDING,
		},
	},
	{ _id: false },
);

// Main schema
const dispensingSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Hospital", required: true },
		prescriptionId: { type: String, ref: "Prescription", required: true },
		status: {
			type: String,
			enum: Object.values(DispensingStatus),
			default: DispensingStatus.PENDING,
		},
		assignedTo: { type: String, ref: "Staff" },
		startedAt: { type: Date },
		completedAt: { type: Date },
		collectedAt: { type: Date },
		medicines: [{ type: dispensingMedicineSchema }],
		notes: { type: String },
		patientCounseled: { type: Boolean, default: false },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{
		collection: "dispensing",
		timestamps: true,
	},
);

// Indexes
dispensingSchema.index({ tenantId: 1, prescriptionId: 1 }, { unique: true });
dispensingSchema.index({ tenantId: 1, status: 1 });
dispensingSchema.index({ tenantId: 1, assignedTo: 1, status: 1 });
dispensingSchema.index({ tenantId: 1, createdAt: -1 });

const Dispensing = model("Dispensing", dispensingSchema);

export { Dispensing };

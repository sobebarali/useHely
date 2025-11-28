import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Enums
export const MedicineCategory = {
	ANALGESICS: "ANALGESICS",
	ANTIBIOTICS: "ANTIBIOTICS",
	ANTIDIABETICS: "ANTIDIABETICS",
	ANTIHYPERTENSIVES: "ANTIHYPERTENSIVES",
	ANTIHISTAMINES: "ANTIHISTAMINES",
	CARDIOVASCULAR: "CARDIOVASCULAR",
	GASTROINTESTINAL: "GASTROINTESTINAL",
	RESPIRATORY: "RESPIRATORY",
	VITAMINS: "VITAMINS",
	TOPICAL: "TOPICAL",
	INJECTABLE: "INJECTABLE",
	OTHER: "OTHER",
} as const;

export const MedicineType = {
	TABLET: "TABLET",
	CAPSULE: "CAPSULE",
	SYRUP: "SYRUP",
	INJECTION: "INJECTION",
	CREAM: "CREAM",
	OINTMENT: "OINTMENT",
	DROPS: "DROPS",
	INHALER: "INHALER",
	POWDER: "POWDER",
	SUSPENSION: "SUSPENSION",
} as const;

// Main schema
const medicineSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Hospital", required: true },
		name: { type: String, required: true },
		genericName: { type: String },
		code: { type: String, required: true },
		category: {
			type: String,
			enum: Object.values(MedicineCategory),
			required: true,
		},
		type: {
			type: String,
			enum: Object.values(MedicineType),
			required: true,
		},
		manufacturer: { type: String },
		strength: { type: String },
		unit: { type: String, required: true },
		description: { type: String },
		isActive: { type: Boolean, default: true },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{
		collection: "medicine",
		timestamps: true,
	},
);

// Indexes
medicineSchema.index({ tenantId: 1, code: 1 }, { unique: true });
medicineSchema.index({ tenantId: 1, name: 1 });
medicineSchema.index({ tenantId: 1, genericName: 1 });
medicineSchema.index({ tenantId: 1, category: 1, isActive: 1 });

const Medicine = model("Medicine", medicineSchema);

export { Medicine };

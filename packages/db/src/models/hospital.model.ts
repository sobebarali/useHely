import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Enums
export const HospitalStatus = {
	PENDING: "PENDING",
	VERIFIED: "VERIFIED",
	ACTIVE: "ACTIVE",
	SUSPENDED: "SUSPENDED",
	INACTIVE: "INACTIVE",
} as const;

// Sub-schemas
const addressSchema = new Schema(
	{
		street: { type: String },
		city: { type: String },
		state: { type: String },
		postalCode: { type: String },
		country: { type: String },
	},
	{ _id: false },
);

// Main schema
const hospitalSchema = new Schema(
	{
		_id: { type: String },
		name: { type: String, required: true },
		slug: { type: String, required: true, unique: true },
		licenseNumber: { type: String, required: true, unique: true },
		address: { type: addressSchema },
		contactEmail: { type: String, required: true },
		contactPhone: { type: String, required: true },
		adminEmail: { type: String, required: true },
		adminPhone: { type: String, required: true },
		status: {
			type: String,
			enum: Object.values(HospitalStatus),
			default: HospitalStatus.PENDING,
		},
		verificationToken: { type: String },
		verificationExpires: { type: Date },
		settings: { type: Schema.Types.Mixed },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{
		collection: "hospital",
		timestamps: true,
	},
);

// Indexes
hospitalSchema.index({ status: 1 });
hospitalSchema.index({ createdAt: -1 });

const Hospital = model("Hospital", hospitalSchema);

export { Hospital };

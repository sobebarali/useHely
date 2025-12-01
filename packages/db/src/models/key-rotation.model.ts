import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Main schema
const keyRotationSchema = new Schema(
	{
		_id: { type: String },
		keyId: { type: String, required: true },
		rotatedAt: { type: Date, required: true, default: Date.now },
		rotatedBy: { type: String, ref: "User", required: true },
		recordsReEncrypted: { type: Number, default: 0 },
	},
	{
		collection: "key_rotation",
		timestamps: true,
	},
);

// Indexes
keyRotationSchema.index({ rotatedAt: -1 }); // Sort by most recent
keyRotationSchema.index({ keyId: 1 });

const KeyRotation = model("KeyRotation", keyRotationSchema);

export { KeyRotation };

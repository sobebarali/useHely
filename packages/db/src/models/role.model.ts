import mongoose from "mongoose";

const { Schema, model } = mongoose;

const roleSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Hospital", required: true },
		name: { type: String, required: true },
		description: { type: String },
		permissions: [{ type: String }],
		isSystem: { type: Boolean, default: false },
		isActive: { type: Boolean, default: true },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{
		collection: "role",
		timestamps: true,
	},
);

// Indexes
roleSchema.index({ tenantId: 1, name: 1 }, { unique: true });
roleSchema.index({ tenantId: 1, isActive: 1 });

const Role = model("Role", roleSchema);

export { Role };

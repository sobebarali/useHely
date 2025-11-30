import mongoose from "mongoose";
import { fieldEncryptionPlugin } from "../plugins/field-encryption.plugin";

const { Schema, model } = mongoose;

// Enums
export const StaffShift = {
	MORNING: "MORNING",
	EVENING: "EVENING",
	NIGHT: "NIGHT",
} as const;

export const StaffStatus = {
	ACTIVE: "ACTIVE",
	INACTIVE: "INACTIVE",
	PASSWORD_EXPIRED: "PASSWORD_EXPIRED",
} as const;

// Main schema
const staffSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Hospital", required: true },
		userId: { type: String, ref: "User", required: true },
		employeeId: { type: String, required: true },
		firstName: { type: String, required: true },
		lastName: { type: String, required: true },
		phone: { type: String },
		departmentId: { type: String, ref: "Department" },
		roles: [{ type: String, ref: "Role" }],
		specialization: { type: String },
		shift: {
			type: String,
			enum: Object.values(StaffShift),
		},
		status: {
			type: String,
			enum: Object.values(StaffStatus),
			default: StaffStatus.ACTIVE,
		},
		lastLogin: { type: Date },
		deactivatedAt: { type: Date },
		passwordHistory: [{ type: String }],
		forcePasswordChange: { type: Boolean, default: false },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{
		collection: "staff",
		timestamps: true,
	},
);

// Indexes
staffSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
staffSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });
staffSchema.index({ tenantId: 1, departmentId: 1 });
staffSchema.index({ tenantId: 1, status: 1 });
staffSchema.index({ tenantId: 1, roles: 1 });

// Field-level encryption for PII data
staffSchema.plugin(fieldEncryptionPlugin, {
	fields: ["phone"],
	getMasterKey: () => process.env.ENCRYPTION_MASTER_KEY,
});

const Staff = model("Staff", staffSchema);

export { Staff };

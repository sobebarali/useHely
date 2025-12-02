import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Enums
export const DepartmentType = {
	CLINICAL: "CLINICAL",
	ADMINISTRATIVE: "ADMINISTRATIVE",
	SUPPORT: "SUPPORT",
	DIAGNOSTIC: "DIAGNOSTIC",
	PHARMACY: "PHARMACY",
	EMERGENCY: "EMERGENCY",
} as const;

export const DepartmentStatus = {
	ACTIVE: "ACTIVE",
	INACTIVE: "INACTIVE",
	SUSPENDED: "SUSPENDED",
} as const;

// Sub-schemas
const operatingHoursSchema = new Schema(
	{
		start: { type: String },
		end: { type: String },
	},
	{ _id: false },
);

const weeklyHoursSchema = new Schema(
	{
		monday: { type: operatingHoursSchema },
		tuesday: { type: operatingHoursSchema },
		wednesday: { type: operatingHoursSchema },
		thursday: { type: operatingHoursSchema },
		friday: { type: operatingHoursSchema },
		saturday: { type: operatingHoursSchema },
		sunday: { type: operatingHoursSchema },
	},
	{ _id: false },
);

const contactSchema = new Schema(
	{
		phone: { type: String },
		email: { type: String },
	},
	{ _id: false },
);

// Main schema
const departmentSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Organization", required: true },
		name: { type: String, required: true },
		code: { type: String, required: true },
		description: { type: String },
		type: {
			type: String,
			enum: Object.values(DepartmentType),
			required: true,
		},
		parentId: { type: String, ref: "Department", default: null },
		headId: { type: String, ref: "Staff", default: null },
		location: { type: String },
		contact: { type: contactSchema },
		operatingHours: { type: weeklyHoursSchema },
		status: {
			type: String,
			enum: Object.values(DepartmentStatus),
			default: DepartmentStatus.ACTIVE,
		},
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{
		collection: "department",
		timestamps: true,
	},
);

// Indexes
departmentSchema.index({ tenantId: 1, code: 1 }, { unique: true });
departmentSchema.index({ tenantId: 1, name: 1 }, { unique: true });
departmentSchema.index({ tenantId: 1, status: 1 });
departmentSchema.index({ tenantId: 1, type: 1 });
departmentSchema.index({ tenantId: 1, parentId: 1 });

const Department = model("Department", departmentSchema);

export { Department };

import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Enums
export const OrganizationType = {
	HOSPITAL: "HOSPITAL",
	CLINIC: "CLINIC",
	SOLO_PRACTICE: "SOLO_PRACTICE",
} as const;

export type OrganizationTypeValue =
	(typeof OrganizationType)[keyof typeof OrganizationType];

export const OrganizationStatus = {
	PENDING: "PENDING",
	VERIFIED: "VERIFIED",
	ACTIVE: "ACTIVE",
	SUSPENDED: "SUSPENDED",
	INACTIVE: "INACTIVE",
} as const;

export type OrganizationStatusValue =
	(typeof OrganizationStatus)[keyof typeof OrganizationStatus];

export const PricingTier = {
	FREE: "FREE",
	STARTER: "STARTER",
	PROFESSIONAL: "PROFESSIONAL",
	ENTERPRISE: "ENTERPRISE",
} as const;

export type PricingTierValue = (typeof PricingTier)[keyof typeof PricingTier];

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
const organizationSchema = new Schema(
	{
		_id: { type: String },
		name: { type: String, required: true },
		slug: { type: String, required: true, unique: true },
		type: {
			type: String,
			enum: Object.values(OrganizationType),
			default: OrganizationType.HOSPITAL,
			required: true,
		},
		licenseNumber: { type: String, sparse: true, unique: true },
		address: { type: addressSchema },
		contactEmail: { type: String, required: true },
		contactPhone: { type: String, required: true },
		adminEmail: { type: String, required: true },
		adminPhone: { type: String, required: true },
		status: {
			type: String,
			enum: Object.values(OrganizationStatus),
			default: OrganizationStatus.PENDING,
		},
		pricingTier: {
			type: String,
			enum: Object.values(PricingTier),
			default: PricingTier.FREE,
		},
		verificationToken: { type: String },
		verificationExpires: { type: Date },
		settings: { type: Schema.Types.Mixed },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{
		collection: "organization",
		timestamps: true,
	},
);

// Indexes
organizationSchema.index({ status: 1 });
organizationSchema.index({ type: 1 });
organizationSchema.index({ createdAt: -1 });

const Organization = model("Organization", organizationSchema);

// Export aliases for backward compatibility
export { Organization };
export { Organization as Hospital };
export { OrganizationStatus as HospitalStatus };

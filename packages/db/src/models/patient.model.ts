import mongoose from "mongoose";
import { fieldEncryptionPlugin } from "../plugins/field-encryption.plugin";

const { Schema, model } = mongoose;

// Enums
export const Gender = {
	MALE: "MALE",
	FEMALE: "FEMALE",
	OTHER: "OTHER",
} as const;

export const PatientType = {
	OPD: "OPD",
	IPD: "IPD",
} as const;

export const PatientStatus = {
	ACTIVE: "ACTIVE",
	DISCHARGED: "DISCHARGED",
	COMPLETED: "COMPLETED",
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

const emergencyContactSchema = new Schema(
	{
		name: { type: String, required: true },
		relationship: { type: String, required: true },
		phone: { type: String, required: true },
	},
	{ _id: false },
);

// Main schema
const patientSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Organization", required: true },
		patientId: { type: String, required: true },
		firstName: { type: String, required: true },
		lastName: { type: String, required: true },
		dateOfBirth: { type: Date, required: true },
		gender: {
			type: String,
			enum: Object.values(Gender),
			required: true,
		},
		bloodGroup: { type: String },
		phone: { type: String, required: true },
		email: { type: String },
		address: { type: addressSchema },
		emergencyContact: { type: emergencyContactSchema, required: true },
		photoUrl: { type: String },
		patientType: {
			type: String,
			enum: Object.values(PatientType),
			required: true,
		},
		departmentId: { type: String, ref: "Department" },
		assignedDoctorId: { type: String, ref: "Staff" },
		status: {
			type: String,
			enum: Object.values(PatientStatus),
			default: PatientStatus.ACTIVE,
		},
	},
	{
		collection: "patient",
		timestamps: true,
	},
);

// Indexes
patientSchema.index({ tenantId: 1, patientId: 1 }, { unique: true });
patientSchema.index({ tenantId: 1, phone: 1 });
patientSchema.index({ tenantId: 1, email: 1 }, { sparse: true });
patientSchema.index({ tenantId: 1, patientType: 1, status: 1 });
patientSchema.index({ tenantId: 1, departmentId: 1 });
patientSchema.index({ tenantId: 1, assignedDoctorId: 1 });
patientSchema.index({ tenantId: 1, firstName: 1, lastName: 1 });
patientSchema.index({ tenantId: 1, createdAt: -1 });

// Field-level encryption for PHI/PII data
patientSchema.plugin(fieldEncryptionPlugin, {
	fields: [
		"firstName",
		"lastName",
		"phone",
		"email",
		"address.street",
		"address.city",
		"address.state",
		"address.postalCode",
		"address.country",
		"emergencyContact.name",
		"emergencyContact.phone",
		"emergencyContact.relationship",
	],
	getMasterKey: () => process.env.ENCRYPTION_MASTER_KEY,
});

const Patient = model("Patient", patientSchema);

export { Patient };

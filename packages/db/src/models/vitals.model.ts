import mongoose from "mongoose";
import { fieldEncryptionPlugin } from "../plugins/field-encryption.plugin";

const { Schema, model } = mongoose;

// Enums
export const TemperatureUnit = {
	CELSIUS: "CELSIUS",
	FAHRENHEIT: "FAHRENHEIT",
} as const;

export const WeightUnit = {
	KG: "KG",
	LB: "LB",
} as const;

export const HeightUnit = {
	CM: "CM",
	IN: "IN",
} as const;

export const GlucoseUnit = {
	MG_DL: "MG_DL",
	MMOL_L: "MMOL_L",
} as const;

export const GlucoseTiming = {
	FASTING: "FASTING",
	RANDOM: "RANDOM",
	POSTPRANDIAL: "POSTPRANDIAL",
} as const;

export const AlertSeverity = {
	LOW: "LOW",
	MEDIUM: "MEDIUM",
	HIGH: "HIGH",
	CRITICAL: "CRITICAL",
} as const;

// Sub-schemas
const temperatureSchema = new Schema(
	{
		value: { type: Number },
		unit: { type: String, enum: Object.values(TemperatureUnit) },
	},
	{ _id: false },
);

const bloodPressureSchema = new Schema(
	{
		systolic: { type: Number },
		diastolic: { type: Number },
	},
	{ _id: false },
);

const weightSchema = new Schema(
	{
		value: { type: Number },
		unit: { type: String, enum: Object.values(WeightUnit) },
	},
	{ _id: false },
);

const heightSchema = new Schema(
	{
		value: { type: Number },
		unit: { type: String, enum: Object.values(HeightUnit) },
	},
	{ _id: false },
);

const bloodGlucoseSchema = new Schema(
	{
		value: { type: Number },
		unit: { type: String, enum: Object.values(GlucoseUnit) },
		timing: { type: String, enum: Object.values(GlucoseTiming) },
	},
	{ _id: false },
);

const alertSchema = new Schema(
	{
		type: { type: String },
		parameter: { type: String },
		value: { type: Number },
		severity: { type: String, enum: Object.values(AlertSeverity) },
	},
	{ _id: false },
);

// Main schema
const vitalsSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Organization", required: true },
		patientId: { type: String, ref: "Patient", required: true },
		appointmentId: { type: String, ref: "Appointment" },
		admissionId: { type: String, ref: "Admission" },
		temperature: { type: temperatureSchema },
		bloodPressure: { type: bloodPressureSchema },
		heartRate: { type: Number },
		respiratoryRate: { type: Number },
		oxygenSaturation: { type: Number },
		weight: { type: weightSchema },
		height: { type: heightSchema },
		bmi: { type: Number },
		bloodGlucose: { type: bloodGlucoseSchema },
		painLevel: { type: Number, min: 0, max: 10 },
		notes: { type: String },
		correctionReason: { type: String }, // Reason for correction when notes are updated
		alerts: [{ type: alertSchema }],
		recordedBy: { type: String, ref: "Staff", required: true },
		recordedAt: { type: Date, required: true },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{
		collection: "vitals",
		timestamps: true,
	},
);

// Indexes
vitalsSchema.index({ tenantId: 1, patientId: 1, recordedAt: -1 });
vitalsSchema.index({ tenantId: 1, appointmentId: 1 });
vitalsSchema.index({ tenantId: 1, admissionId: 1 });
vitalsSchema.index({ tenantId: 1, recordedAt: -1 });
vitalsSchema.index({ tenantId: 1, "alerts.severity": 1 });

// Field-level encryption for PHI data
vitalsSchema.plugin(fieldEncryptionPlugin, {
	fields: ["notes", "correctionReason"],
	getMasterKey: () => process.env.ENCRYPTION_MASTER_KEY,
});

const Vitals = model("Vitals", vitalsSchema);

export { Vitals };

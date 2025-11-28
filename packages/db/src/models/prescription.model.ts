import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Enums
export const PrescriptionStatus = {
	PENDING: "PENDING",
	DISPENSING: "DISPENSING",
	DISPENSED: "DISPENSED",
	COMPLETED: "COMPLETED",
	CANCELLED: "CANCELLED",
} as const;

// Sub-schemas
const medicineItemSchema = new Schema(
	{
		medicineId: { type: String, ref: "Medicine" },
		name: { type: String, required: true },
		genericName: { type: String },
		dosage: { type: String, required: true },
		frequency: { type: String, required: true },
		duration: { type: String, required: true },
		route: { type: String },
		quantity: { type: Number },
		instructions: { type: String },
		dispensed: { type: Boolean, default: false },
		dispensedQuantity: { type: Number, default: 0 },
	},
	{ _id: true },
);

const templateMedicineSchema = new Schema(
	{
		medicineId: { type: String, ref: "Medicine" },
		name: { type: String, required: true },
		genericName: { type: String },
		dosage: { type: String },
		frequency: { type: String },
		duration: { type: String },
		route: { type: String },
		instructions: { type: String },
	},
	{ _id: true },
);

// Main Prescription schema
const prescriptionSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Hospital", required: true },
		prescriptionId: { type: String, required: true },
		patientId: { type: String, ref: "Patient", required: true },
		doctorId: { type: String, ref: "Staff", required: true },
		appointmentId: { type: String, ref: "Appointment" },
		diagnosis: { type: String, required: true },
		notes: { type: String },
		medicines: [{ type: medicineItemSchema }],
		status: {
			type: String,
			enum: Object.values(PrescriptionStatus),
			default: PrescriptionStatus.PENDING,
		},
		followUpDate: { type: Date },
		templateId: { type: String, ref: "PrescriptionTemplate" },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{
		collection: "prescription",
		timestamps: true,
	},
);

// Indexes
prescriptionSchema.index({ tenantId: 1, prescriptionId: 1 }, { unique: true });
prescriptionSchema.index({ tenantId: 1, patientId: 1, createdAt: -1 });
prescriptionSchema.index({ tenantId: 1, doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ tenantId: 1, status: 1 });
prescriptionSchema.index({ tenantId: 1, createdAt: -1 });

// Prescription Template schema
const prescriptionTemplateSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Hospital", required: true },
		name: { type: String, required: true },
		category: { type: String },
		condition: { type: String },
		medicines: [{ type: templateMedicineSchema }],
		isSystem: { type: Boolean, default: false },
		createdBy: { type: String, ref: "Staff" },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{
		collection: "prescription_template",
		timestamps: true,
	},
);

// Indexes
prescriptionTemplateSchema.index({ tenantId: 1, name: 1 }, { unique: true });
prescriptionTemplateSchema.index({ tenantId: 1, category: 1 });

const Prescription = model("Prescription", prescriptionSchema);
const PrescriptionTemplate = model(
	"PrescriptionTemplate",
	prescriptionTemplateSchema,
);

export { Prescription, PrescriptionTemplate };

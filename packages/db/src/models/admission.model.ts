import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Enums
export const AdmissionStatus = {
	ADMITTED: "ADMITTED",
	UNDER_TREATMENT: "UNDER_TREATMENT",
	DISCHARGED: "DISCHARGED",
	TRANSFERRED: "TRANSFERRED",
	ABSCONDED: "ABSCONDED",
} as const;

export const DischargeType = {
	NORMAL: "NORMAL",
	LAMA: "LAMA", // Left Against Medical Advice
	REFERRED: "REFERRED",
	EXPIRED: "EXPIRED",
	ABSCONDED: "ABSCONDED",
} as const;

// Main schema
const admissionSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Hospital", required: true },
		admissionNumber: { type: String, required: true },
		patientId: { type: String, ref: "Patient", required: true },
		doctorId: { type: String, ref: "Staff", required: true },
		departmentId: { type: String, ref: "Department", required: true },
		admissionDate: { type: Date, required: true },
		dischargeDate: { type: Date },
		bedNumber: { type: String },
		roomNumber: { type: String },
		ward: { type: String },
		admissionReason: { type: String, required: true },
		provisionalDiagnosis: { type: String },
		finalDiagnosis: { type: String },
		status: {
			type: String,
			enum: Object.values(AdmissionStatus),
			default: AdmissionStatus.ADMITTED,
		},
		dischargeType: {
			type: String,
			enum: Object.values(DischargeType),
		},
		dischargeSummary: { type: String },
		notes: { type: String },
		admittedBy: { type: String, ref: "Staff" },
		dischargedBy: { type: String, ref: "Staff" },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{
		collection: "admission",
		timestamps: true,
	},
);

// Indexes
admissionSchema.index({ tenantId: 1, admissionNumber: 1 }, { unique: true });
admissionSchema.index({ tenantId: 1, patientId: 1, admissionDate: -1 });
admissionSchema.index({ tenantId: 1, doctorId: 1, status: 1 });
admissionSchema.index({ tenantId: 1, departmentId: 1, status: 1 });
admissionSchema.index({ tenantId: 1, status: 1 });
admissionSchema.index({ tenantId: 1, admissionDate: -1 });
admissionSchema.index({ tenantId: 1, bedNumber: 1, roomNumber: 1 });

const Admission = model("Admission", admissionSchema);

export { Admission };

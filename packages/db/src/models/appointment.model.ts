import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Enums
export const AppointmentType = {
	CONSULTATION: "CONSULTATION",
	FOLLOW_UP: "FOLLOW_UP",
	PROCEDURE: "PROCEDURE",
	EMERGENCY: "EMERGENCY",
	ROUTINE_CHECK: "ROUTINE_CHECK",
} as const;

export const AppointmentPriority = {
	NORMAL: "NORMAL",
	URGENT: "URGENT",
	EMERGENCY: "EMERGENCY",
} as const;

export const AppointmentStatus = {
	SCHEDULED: "SCHEDULED",
	CONFIRMED: "CONFIRMED",
	CHECKED_IN: "CHECKED_IN",
	IN_PROGRESS: "IN_PROGRESS",
	COMPLETED: "COMPLETED",
	CANCELLED: "CANCELLED",
	NO_SHOW: "NO_SHOW",
} as const;

// Sub-schemas
const timeSlotSchema = new Schema(
	{
		start: { type: String, required: true },
		end: { type: String, required: true },
	},
	{ _id: false },
);

// Main schema
const appointmentSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Hospital", required: true },
		appointmentNumber: { type: String, required: true },
		patientId: { type: String, ref: "Patient", required: true },
		doctorId: { type: String, ref: "Staff", required: true },
		departmentId: { type: String, ref: "Department", required: true },
		date: { type: Date, required: true },
		timeSlot: { type: timeSlotSchema, required: true },
		type: {
			type: String,
			enum: Object.values(AppointmentType),
			required: true,
		},
		priority: {
			type: String,
			enum: Object.values(AppointmentPriority),
			default: AppointmentPriority.NORMAL,
		},
		reason: { type: String },
		notes: { type: String },
		status: {
			type: String,
			enum: Object.values(AppointmentStatus),
			default: AppointmentStatus.SCHEDULED,
		},
		queueNumber: { type: Number },
		checkedInAt: { type: Date },
		completedAt: { type: Date },
		followUpRequired: { type: Boolean },
		followUpDate: { type: Date },
		cancelledAt: { type: Date },
		cancelledBy: { type: String, ref: "Staff" },
		cancellationReason: { type: String },
		createdBy: { type: String, ref: "Staff" },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{
		collection: "appointment",
		timestamps: true,
	},
);

// Indexes
appointmentSchema.index(
	{ tenantId: 1, appointmentNumber: 1 },
	{ unique: true },
);
appointmentSchema.index({ tenantId: 1, patientId: 1, date: 1 });
appointmentSchema.index({ tenantId: 1, doctorId: 1, date: 1 });
appointmentSchema.index({ tenantId: 1, departmentId: 1, date: 1 });
appointmentSchema.index({ tenantId: 1, date: 1, status: 1 });
appointmentSchema.index({ tenantId: 1, status: 1 });

const Appointment = model("Appointment", appointmentSchema);

export { Appointment };

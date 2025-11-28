import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Counter types
export const CounterType = {
	PATIENT: "patient",
	PRESCRIPTION: "prescription",
	APPOINTMENT: "appointment",
	ADMISSION: "admission",
	EMPLOYEE: "employee",
} as const;

// Main schema
const counterSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Hospital", required: true },
		type: {
			type: String,
			enum: Object.values(CounterType),
			required: true,
		},
		seq: { type: Number, default: 0 },
	},
	{
		collection: "counter",
	},
);

// Indexes
counterSchema.index({ tenantId: 1, type: 1 }, { unique: true });

// Static method to get next sequence
counterSchema.statics.getNextSequence = async function (
	tenantId: string,
	type: string,
): Promise<number> {
	const counter = await this.findOneAndUpdate(
		{ tenantId, type },
		{ $inc: { seq: 1 } },
		{ new: true, upsert: true },
	);
	return counter.seq;
};

const Counter = model("Counter", counterSchema);

export { Counter };

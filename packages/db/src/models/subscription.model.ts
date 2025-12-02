import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Enums
export const SubscriptionStatus = {
	PENDING: "PENDING",
	ACTIVE: "ACTIVE",
	ON_HOLD: "ON_HOLD",
	CANCELLED: "CANCELLED",
	EXPIRED: "EXPIRED",
} as const;

export type SubscriptionStatusValue =
	(typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const BillingCycle = {
	MONTHLY: "MONTHLY",
	YEARLY: "YEARLY",
} as const;

export type BillingCycleValue =
	(typeof BillingCycle)[keyof typeof BillingCycle];

// Main schema
const subscriptionSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Organization", required: true },
		dodoCustomerId: { type: String, required: true },
		dodoSubscriptionId: { type: String, required: true },
		dodoProductId: { type: String, required: true },
		status: {
			type: String,
			enum: Object.values(SubscriptionStatus),
			default: SubscriptionStatus.PENDING,
		},
		billingCycle: {
			type: String,
			enum: Object.values(BillingCycle),
			required: true,
		},
		currentPeriodStart: { type: Date, required: true },
		currentPeriodEnd: { type: Date, required: true },
		cancelAtPeriodEnd: { type: Boolean, default: false },
		trialEndsAt: { type: Date },
		onHoldSince: { type: Date },
		gracePeriodEndsAt: { type: Date },
		cancelledAt: { type: Date },
		cancelledBy: { type: String, ref: "Staff" },
		metadata: { type: Schema.Types.Mixed },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{
		collection: "subscription",
		timestamps: true,
	},
);

// Indexes
// One subscription per tenant
subscriptionSchema.index({ tenantId: 1 }, { unique: true });
// Lookup by Dodo subscription ID
subscriptionSchema.index({ dodoSubscriptionId: 1 }, { unique: true });
// Lookup by Dodo customer ID
subscriptionSchema.index({ dodoCustomerId: 1 });
// Query by status
subscriptionSchema.index({ status: 1 });
// Grace period expiration queries (for scheduled jobs)
subscriptionSchema.index({ gracePeriodEndsAt: 1 });
// Current period end (for renewal reminders)
subscriptionSchema.index({ currentPeriodEnd: 1 });

const Subscription = model("Subscription", subscriptionSchema);

export { Subscription };

import mongoose from "mongoose";

const { Schema, model } = mongoose;

// MFA Configuration sub-schema
const mfaConfigSchema = new Schema(
	{
		enabled: { type: Boolean, default: false },
		secret: { type: String }, // TOTP secret (will be encrypted)
		backupCodes: [{ type: String }], // Hashed backup codes
		verifiedAt: { type: Date }, // When MFA was last verified
	},
	{ _id: false },
);

const userSchema = new Schema(
	{
		_id: { type: String },
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		emailVerified: { type: Boolean, required: true },
		image: { type: String },
		mfaConfig: { type: mfaConfigSchema },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{ collection: "user" },
);

const sessionSchema = new Schema(
	{
		_id: { type: String },
		expiresAt: { type: Date, required: true },
		token: { type: String, required: true, unique: true },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
		ipAddress: { type: String },
		userAgent: { type: String },
		userId: { type: String, ref: "User", required: true },
		tenantId: { type: String, ref: "Organization" }, // Optional for backward compatibility with existing sessions
	},
	{ collection: "session" },
);

const accountSchema = new Schema(
	{
		_id: { type: String },
		accountId: { type: String, required: true },
		providerId: { type: String, required: true },
		userId: { type: String, ref: "User", required: true },
		accessToken: { type: String },
		refreshToken: { type: String },
		idToken: { type: String },
		accessTokenExpiresAt: { type: Date },
		refreshTokenExpiresAt: { type: Date },
		scope: { type: String },
		password: { type: String },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{ collection: "account" },
);

const verificationSchema = new Schema(
	{
		_id: { type: String },
		identifier: { type: String, required: true },
		value: { type: String, required: true },
		expiresAt: { type: Date, required: true },
		createdAt: { type: Date },
		updatedAt: { type: Date },
	},
	{ collection: "verification" },
);

// Encryption/Decryption hooks for MFA secret
// Note: We'll add these when the encryption utilities are available in the db package
// For now, encryption will be handled at the application layer

const User = model("User", userSchema);
const Session = model("Session", sessionSchema);
const Account = model("Account", accountSchema);
const Verification = model("Verification", verificationSchema);

export { User, Session, Account, Verification };

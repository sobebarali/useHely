import { User } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/auth/mfa/enable - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create test context
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["ROLE:READ"],
			createStaff: true,
		});

		// Get access token
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		// Clear MFA config before cleanup
		await User.findByIdAndUpdate(context.userId, {
			$unset: { mfaConfig: 1 },
		});

		await context.cleanup();
	});

	it("should generate TOTP secret (32 bytes, base32)", async () => {
		const response = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toHaveProperty("secret");

		// Verify base32 format (uppercase letters A-Z and digits 2-7)
		const secret = response.body.data.secret;
		expect(secret).toMatch(/^[A-Z2-7]+$/);
		// 32 bytes = 256 bits, in base32 that's approximately 52 characters
		expect(secret.length).toBeGreaterThanOrEqual(32);
	});

	it("should generate QR code data URL", async () => {
		// First clear MFA config from previous test
		await User.findByIdAndUpdate(context.userId, {
			$unset: { mfaConfig: 1 },
		});

		const response = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveProperty("qrCodeDataUrl");

		// Verify data URL format (PNG image)
		const qrCodeDataUrl = response.body.data.qrCodeDataUrl;
		expect(qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
	});

	it("should generate 10 backup codes", async () => {
		// First clear MFA config from previous test
		await User.findByIdAndUpdate(context.userId, {
			$unset: { mfaConfig: 1 },
		});

		const response = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveProperty("backupCodes");

		const backupCodes = response.body.data.backupCodes;
		expect(Array.isArray(backupCodes)).toBe(true);
		expect(backupCodes).toHaveLength(10);
	});

	it("should generate unique 8-character alphanumeric backup codes", async () => {
		// First clear MFA config from previous test
		await User.findByIdAndUpdate(context.userId, {
			$unset: { mfaConfig: 1 },
		});

		const response = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const backupCodes = response.body.data.backupCodes as string[];

		// Verify each backup code format
		for (const code of backupCodes) {
			expect(code).toMatch(/^[A-F0-9]{8}$/); // 8 hex chars, uppercase
		}

		// Verify uniqueness
		const uniqueCodes = new Set(backupCodes);
		expect(uniqueCodes.size).toBe(10);
	});

	it("should hash backup codes before storage", async () => {
		// First clear MFA config from previous test
		await User.findByIdAndUpdate(context.userId, {
			$unset: { mfaConfig: 1 },
		});

		const response = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		// Get user from database to check stored backup codes
		const user = await User.findById(context.userId).lean();

		expect(user?.mfaConfig).toBeDefined();
		expect(user?.mfaConfig?.backupCodes).toBeDefined();
		expect(user?.mfaConfig?.backupCodes).toHaveLength(10);

		// Verify stored backup codes are hashed (bcrypt format: $2a$ or $2b$)
		for (const hashedCode of user?.mfaConfig?.backupCodes || []) {
			expect(hashedCode).toMatch(/^\$2[ab]\$\d{2}\$/);
			// Hashed codes should NOT match the plain text codes
			expect(response.body.data.backupCodes).not.toContain(hashedCode);
		}
	});

	it("should set MFA status to disabled until verified", async () => {
		// First clear MFA config from previous test
		await User.findByIdAndUpdate(context.userId, {
			$unset: { mfaConfig: 1 },
		});

		const response = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		// Check database state
		const user = await User.findById(context.userId).lean();

		expect(user?.mfaConfig).toBeDefined();
		expect(user?.mfaConfig?.enabled).toBe(false);
		expect(user?.mfaConfig?.secret).toBeDefined();
		// Secret should be encrypted
		expect(user?.mfaConfig?.secret).not.toBe(response.body.data.secret);
	});

	it("should encrypt TOTP secret before storage", async () => {
		// First clear MFA config from previous test
		await User.findByIdAndUpdate(context.userId, {
			$unset: { mfaConfig: 1 },
		});

		const response = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		// Get user from database
		const user = await User.findById(context.userId).lean();

		// Verify secret is encrypted (not the plain base32 value)
		const plainSecret = response.body.data.secret;
		const storedSecret = user?.mfaConfig?.secret;

		expect(storedSecret).toBeDefined();
		expect(storedSecret).not.toBe(plainSecret);
		// Encrypted values should be longer and different format
		expect(storedSecret?.length).toBeGreaterThan(plainSecret.length);
	});

	it("should require authentication", async () => {
		const response = await request(app).post("/api/auth/mfa/enable");

		expect(response.status).toBe(401);
	});
});

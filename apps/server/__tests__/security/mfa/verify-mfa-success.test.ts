import { User } from "@hms/db";
import speakeasy from "speakeasy";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";
import {
	cleanupSecurityEventsForUser,
	waitForSecurityEvent,
} from "../../helpers/security-test-helper";

describe("POST /api/auth/mfa/verify - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let totpSecret: string;

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

		// Enable MFA first
		const enableResponse = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(enableResponse.status).toBe(200);
		totpSecret = enableResponse.body.data.secret;
	}, 30000);

	afterAll(async () => {
		// Clean up security events
		await cleanupSecurityEventsForUser(context.userId);

		// Clear MFA config before cleanup
		await User.findByIdAndUpdate(context.userId, {
			$unset: { mfaConfig: 1 },
		});

		await context.cleanup();
	});

	it("should activate MFA with valid TOTP code", async () => {
		// Generate valid TOTP code
		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		const response = await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: validCode });

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.enabled).toBe(true);
	});

	it("should set MFA enabled flag to true", async () => {
		// Verify database state
		const user = await User.findById(context.userId).lean();

		expect(user?.mfaConfig).toBeDefined();
		expect(user?.mfaConfig?.enabled).toBe(true);
	});

	it("should record verification timestamp", async () => {
		const user = await User.findById(context.userId).lean();

		expect(user?.mfaConfig?.verifiedAt).toBeDefined();
		expect(user?.mfaConfig?.verifiedAt).toBeInstanceOf(Date);

		// Verify timestamp is recent (within last 10 seconds)
		const verifiedAt = new Date(user?.mfaConfig?.verifiedAt || 0);
		const now = new Date();
		const diffMs = now.getTime() - verifiedAt.getTime();
		expect(diffMs).toBeLessThan(10000);
	});

	it("should return verifiedAt in response", async () => {
		// Re-setup MFA for this test
		await User.findByIdAndUpdate(context.userId, {
			$unset: { mfaConfig: 1 },
		});

		const enableResponse = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(enableResponse.status).toBe(200);
		const newSecret = enableResponse.body.data.secret;

		// Verify with new code
		const validCode = speakeasy.totp({
			secret: newSecret,
			encoding: "base32",
		});

		const response = await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: validCode });

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveProperty("verifiedAt");

		// Verify it's a valid ISO date string
		const verifiedAt = new Date(response.body.data.verifiedAt);
		expect(verifiedAt.toString()).not.toBe("Invalid Date");
	});

	it("should log MFA_ENABLED security event", async () => {
		// Re-setup MFA for this test
		await User.findByIdAndUpdate(context.userId, {
			$unset: { mfaConfig: 1 },
		});
		await cleanupSecurityEventsForUser(context.userId);

		const enableResponse = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(enableResponse.status).toBe(200);
		const newSecret = enableResponse.body.data.secret;

		// Verify with new code
		const validCode = speakeasy.totp({
			secret: newSecret,
			encoding: "base32",
		});

		const response = await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: validCode });

		expect(response.status).toBe(200);

		// Wait for security event
		const event = await waitForSecurityEvent("MFA_ENABLED", context.userId);

		expect(event).toBeDefined();
		expect(event).toHaveProperty("type", "MFA_ENABLED");
		expect(event).toHaveProperty("severity", "low");
		expect(event).toHaveProperty("userId", context.userId);
	});

	it("should require authentication", async () => {
		const response = await request(app)
			.post("/api/auth/mfa/verify")
			.send({ code: "123456" });

		expect(response.status).toBe(401);
	});

	it("should require code in request body", async () => {
		const response = await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({});

		expect(response.status).toBe(400);
	});
});

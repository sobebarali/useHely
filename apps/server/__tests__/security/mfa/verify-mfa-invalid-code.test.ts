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

describe("POST /api/auth/mfa/verify - Invalid Code", () => {
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

	it("should reject invalid TOTP code", async () => {
		const response = await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: "000000" });

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_MFA_CODE");
	});

	it("should log MFA_FAILED security event", async () => {
		await cleanupSecurityEventsForUser(context.userId);

		const response = await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: "999999" });

		expect(response.status).toBe(400);

		// Wait for security event
		const event = await waitForSecurityEvent("MFA_FAILED", context.userId);

		expect(event).toBeDefined();
		expect(event).toHaveProperty("type", "MFA_FAILED");
		expect(event).toHaveProperty("severity", "medium");
		expect(event).toHaveProperty("userId", context.userId);
	});

	it("should keep MFA status as disabled after invalid code", async () => {
		const response = await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: "111111" });

		expect(response.status).toBe(400);

		// Verify MFA remains disabled in database
		const user = await User.findById(context.userId).lean();
		expect(user?.mfaConfig?.enabled).toBe(false);
	});

	it("should reject non-6-digit codes", async () => {
		// Too short
		const response1 = await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: "12345" });

		expect(response1.status).toBe(400);

		// Too long
		const response2 = await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: "1234567" });

		expect(response2.status).toBe(400);

		// Non-numeric
		const response3 = await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: "abcdef" });

		expect(response3.status).toBe(400);
	});

	it("should allow retry with valid code after failed attempt", async () => {
		// First, fail with invalid code
		const failResponse = await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: "000000" });

		expect(failResponse.status).toBe(400);

		// Then succeed with valid code
		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		const successResponse = await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: validCode });

		expect(successResponse.status).toBe(200);
		expect(successResponse.body.data.enabled).toBe(true);
	});
});

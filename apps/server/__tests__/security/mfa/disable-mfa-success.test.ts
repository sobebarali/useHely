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

describe("POST /api/auth/mfa/disable - Success", () => {
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

		// Enable and verify MFA first
		const enableResponse = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(enableResponse.status).toBe(200);
		const totpSecret = enableResponse.body.data.secret;

		// Verify MFA to fully enable it
		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		const verifyResponse = await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: validCode });

		expect(verifyResponse.status).toBe(200);
		expect(verifyResponse.body.data.enabled).toBe(true);
	}, 30000);

	afterAll(async () => {
		// Clean up security events
		await cleanupSecurityEventsForUser(context.userId);

		// Ensure MFA config is cleared
		await User.findByIdAndUpdate(context.userId, {
			$unset: { mfaConfig: 1 },
		});

		await context.cleanup();
	});

	it("should successfully disable MFA", async () => {
		const response = await request(app)
			.post("/api/auth/mfa/disable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.disabled).toBe(true);
	});

	it("should remove TOTP secret from database", async () => {
		// Re-enable MFA for this test
		await cleanupSecurityEventsForUser(context.userId);

		const enableResponse = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(enableResponse.status).toBe(200);
		const totpSecret = enableResponse.body.data.secret;

		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: validCode });

		// Now disable
		const disableResponse = await request(app)
			.post("/api/auth/mfa/disable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(disableResponse.status).toBe(200);

		// Verify secret is removed
		const user = await User.findById(context.userId).lean();
		expect(user?.mfaConfig?.secret).toBeUndefined();
	});

	it("should remove backup codes from database", async () => {
		// Re-enable MFA for this test
		const enableResponse = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(enableResponse.status).toBe(200);
		const totpSecret = enableResponse.body.data.secret;

		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: validCode });

		// Verify backup codes exist before disable
		const userBefore = await User.findById(context.userId).lean();
		expect(userBefore?.mfaConfig?.backupCodes?.length).toBe(10);

		// Now disable
		const disableResponse = await request(app)
			.post("/api/auth/mfa/disable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(disableResponse.status).toBe(200);

		// Verify backup codes are removed
		const userAfter = await User.findById(context.userId).lean();
		expect(userAfter?.mfaConfig?.backupCodes).toBeUndefined();
	});

	it("should log MFA_DISABLED security event", async () => {
		// Re-enable MFA for this test
		await cleanupSecurityEventsForUser(context.userId);

		const enableResponse = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(enableResponse.status).toBe(200);
		const totpSecret = enableResponse.body.data.secret;

		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: validCode });

		// Now disable
		const disableResponse = await request(app)
			.post("/api/auth/mfa/disable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(disableResponse.status).toBe(200);

		// Wait for security event
		const event = await waitForSecurityEvent("MFA_DISABLED", context.userId);

		expect(event).toBeDefined();
		expect(event).toHaveProperty("type", "MFA_DISABLED");
		expect(event).toHaveProperty("severity", "medium");
		expect(event).toHaveProperty("userId", context.userId);
	});

	it("should include helpful message in response", async () => {
		// Re-enable MFA for this test
		const enableResponse = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(enableResponse.status).toBe(200);
		const totpSecret = enableResponse.body.data.secret;

		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: validCode });

		// Now disable
		const response = await request(app)
			.post("/api/auth/mfa/disable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.message).toContain("disabled");
		expect(response.body.data.message).toContain("re-enable");
	});

	it("should require authentication", async () => {
		const response = await request(app).post("/api/auth/mfa/disable");

		expect(response.status).toBe(401);
	});

	it("should return 400 if MFA is not enabled", async () => {
		// Ensure MFA is disabled
		await User.findByIdAndUpdate(context.userId, {
			$unset: { mfaConfig: 1 },
		});

		const response = await request(app)
			.post("/api/auth/mfa/disable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("MFA_NOT_ENABLED");
	});
});

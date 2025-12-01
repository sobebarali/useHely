import { User } from "@hms/db";
import speakeasy from "speakeasy";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";
import { cleanupSecurityEventsForUser } from "../../helpers/security-test-helper";

describe("POST /api/auth/token - Backup Codes Usage", () => {
	let context: AuthTestContext;
	let totpSecret: string;
	let backupCodes: string[];

	beforeAll(async () => {
		// Create test context
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["ROLE:READ"],
			createStaff: true,
		});

		// Get access token to enable MFA
		const tokens = await context.issuePasswordTokens();
		const accessToken = tokens.accessToken;

		// Enable MFA
		const enableResponse = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(enableResponse.status).toBe(200);
		totpSecret = enableResponse.body.data.secret;
		backupCodes = enableResponse.body.data.backupCodes;

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

		// Clear MFA config before cleanup
		await User.findByIdAndUpdate(context.userId, {
			$unset: { mfaConfig: 1 },
		});

		await context.cleanup();
	});

	it("should authenticate with backup code", async () => {
		// First, get the MFA challenge
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		expect(challengeResponse.status).toBe(200);
		const challengeToken = challengeResponse.body.challenge_token;

		// Use first backup code
		const backupCode = backupCodes[0];

		const response = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: backupCode,
		});

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("access_token");
		expect(response.body).toHaveProperty("refresh_token");
	});

	it("should remove backup code after use", async () => {
		// Check initial count
		const userBefore = await User.findById(context.userId).lean();
		const countBefore = userBefore?.mfaConfig?.backupCodes?.length || 0;

		// Get MFA challenge
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		const challengeToken = challengeResponse.body.challenge_token;

		// Use second backup code
		const backupCode = backupCodes[1];

		const response = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: backupCode,
		});

		expect(response.status).toBe(200);

		// Check that one backup code was removed
		const userAfter = await User.findById(context.userId).lean();
		const countAfter = userAfter?.mfaConfig?.backupCodes?.length || 0;

		expect(countAfter).toBe(countBefore - 1);
	});

	it("should not allow reusing a backup code", async () => {
		// First use the third backup code successfully
		const challengeResponse1 = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		const challengeToken1 = challengeResponse1.body.challenge_token;
		const backupCode = backupCodes[2];

		const firstResponse = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken1,
			code: backupCode,
		});

		expect(firstResponse.status).toBe(200);

		// Try to reuse the same backup code
		const challengeResponse2 = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		const challengeToken2 = challengeResponse2.body.challenge_token;

		const secondResponse = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken2,
			code: backupCode,
		});

		// Should fail because the backup code was already used
		expect(secondResponse.status).toBe(400);
		expect(secondResponse.body.code).toBe("INVALID_MFA_CODE");
	});

	it("should accept backup codes case-insensitively", async () => {
		// Get MFA challenge
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		const challengeToken = challengeResponse.body.challenge_token;

		// Use fourth backup code in lowercase
		const backupCode = backupCodes[3]?.toLowerCase() || "";
		expect(backupCode).not.toBe("");

		const response = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: backupCode,
		});

		// Should work since the service uses case-insensitive comparison
		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("access_token");
	});

	it("should work with multiple different backup codes", async () => {
		// Get remaining backup codes count
		const userBefore = await User.findById(context.userId).lean();
		const remainingCount = userBefore?.mfaConfig?.backupCodes?.length || 0;

		// Use several backup codes in succession
		for (let i = 4; i < Math.min(7, backupCodes.length); i++) {
			const challengeResponse = await request(app)
				.post("/api/auth/token")
				.send({
					grant_type: "password",
					username: context.email,
					password: context.password,
					tenant_id: context.hospitalId,
				});

			const challengeToken = challengeResponse.body.challenge_token;
			const backupCode = backupCodes[i];

			const response = await request(app).post("/api/auth/token").send({
				grant_type: "mfa",
				challenge_token: challengeToken,
				code: backupCode,
			});

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("access_token");
		}

		// Verify backup codes decreased
		const userAfter = await User.findById(context.userId).lean();
		const finalCount = userAfter?.mfaConfig?.backupCodes?.length || 0;

		expect(finalCount).toBeLessThan(remainingCount);
	});

	it("should still work with TOTP code even after using backup codes", async () => {
		// Get MFA challenge
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		const challengeToken = challengeResponse.body.challenge_token;

		// Use TOTP code instead of backup code
		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		const response = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: validCode,
		});

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("access_token");
	});

	it("should reject invalid backup codes", async () => {
		// Get MFA challenge
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		const challengeToken = challengeResponse.body.challenge_token;

		// Use a valid format backup code that doesn't match any stored codes
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: "DEADBEEF", // Valid hex format but not a stored backup code
		});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_MFA_CODE");
	});
});

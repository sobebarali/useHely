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

describe("POST /api/auth/token - MFA Verification", () => {
	let context: AuthTestContext;
	let totpSecret: string;

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

	it("should complete authentication with valid TOTP code", async () => {
		// First, get the MFA challenge
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		expect(challengeResponse.status).toBe(200);
		expect(challengeResponse.body.mfa_required).toBe(true);
		const challengeToken = challengeResponse.body.challenge_token;

		// Generate valid TOTP code
		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		// Complete MFA verification
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: validCode,
		});

		expect(response.status).toBe(200);
	});

	it("should return access_token on successful MFA verification", async () => {
		// First, get the MFA challenge
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		const challengeToken = challengeResponse.body.challenge_token;

		// Generate valid TOTP code
		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		// Complete MFA verification
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: validCode,
		});

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("access_token");
		expect(typeof response.body.access_token).toBe("string");
		expect(response.body.access_token.length).toBeGreaterThan(0);
	});

	it("should return refresh_token on successful MFA verification", async () => {
		// First, get the MFA challenge
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		const challengeToken = challengeResponse.body.challenge_token;

		// Generate valid TOTP code
		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		// Complete MFA verification
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: validCode,
		});

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("refresh_token");
		expect(typeof response.body.refresh_token).toBe("string");
		expect(response.body.refresh_token.length).toBeGreaterThan(0);
	});

	it("should return 400 for invalid TOTP code", async () => {
		// First, get the MFA challenge
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		const challengeToken = challengeResponse.body.challenge_token;

		// Use invalid code
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: "000000",
		});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_MFA_CODE");
	});

	it("should return 400 for expired challenge_token", async () => {
		// Use a fake challenge token that doesn't exist in Redis
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: "invalid-or-expired-challenge-token",
			code: "123456",
		});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_MFA_CHALLENGE");
	});

	it("should enforce challenge token as single-use", async () => {
		// First, get the MFA challenge
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		const challengeToken = challengeResponse.body.challenge_token;

		// Generate valid TOTP code
		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		// First MFA verification should succeed
		const firstResponse = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: validCode,
		});

		expect(firstResponse.status).toBe(200);
		expect(firstResponse.body).toHaveProperty("access_token");

		// Second attempt with same challenge token should fail
		const secondResponse = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: validCode,
		});

		expect(secondResponse.status).toBe(400);
		expect(secondResponse.body.code).toBe("INVALID_MFA_CHALLENGE");
	});

	it("should return token_type Bearer", async () => {
		// First, get the MFA challenge
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		const challengeToken = challengeResponse.body.challenge_token;

		// Generate valid TOTP code
		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		// Complete MFA verification
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: validCode,
		});

		expect(response.status).toBe(200);
		expect(response.body.token_type).toBe("Bearer");
	});

	it("should return valid expires_in for access token", async () => {
		// First, get the MFA challenge
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		const challengeToken = challengeResponse.body.challenge_token;

		// Generate valid TOTP code
		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		// Complete MFA verification
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: validCode,
		});

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("expires_in");
		expect(typeof response.body.expires_in).toBe("number");
		expect(response.body.expires_in).toBeGreaterThan(0);
	});

	it("should allow using tokens after MFA verification", async () => {
		// First, get the MFA challenge
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		const challengeToken = challengeResponse.body.challenge_token;

		// Generate valid TOTP code
		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		// Complete MFA verification
		const tokenResponse = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: validCode,
		});

		expect(tokenResponse.status).toBe(200);
		const accessToken = tokenResponse.body.access_token;

		// Use the token to access a protected endpoint
		const meResponse = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(meResponse.status).toBe(200);
		expect(meResponse.body.data.email).toBe(context.email);
	});
});

import { User } from "@hms/db";
import speakeasy from "speakeasy";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/auth/token - MFA Challenge", () => {
	let context: AuthTestContext;

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
		// Clear MFA config before cleanup
		await User.findByIdAndUpdate(context.userId, {
			$unset: { mfaConfig: 1 },
		});

		await context.cleanup();
	});

	it("should return MFA challenge when MFA is enabled", async () => {
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		expect(response.status).toBe(200);
		expect(response.body.mfa_required).toBe(true);
	});

	it("should include challenge_token in response", async () => {
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("challenge_token");
		expect(typeof response.body.challenge_token).toBe("string");
		expect(response.body.challenge_token.length).toBeGreaterThan(0);
	});

	it("should include expires_in of 300 seconds", async () => {
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("expires_in");
		expect(response.body.expires_in).toBe(300);
	});

	it("should NOT return access_token when MFA challenge", async () => {
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		expect(response.status).toBe(200);
		expect(response.body.mfa_required).toBe(true);
		expect(response.body.access_token).toBeUndefined();
	});

	it("should NOT return refresh_token when MFA challenge", async () => {
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		expect(response.status).toBe(200);
		expect(response.body.mfa_required).toBe(true);
		expect(response.body.refresh_token).toBeUndefined();
	});

	it("should generate unique challenge tokens for each request", async () => {
		const response1 = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		const response2 = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		expect(response1.status).toBe(200);
		expect(response2.status).toBe(200);
		expect(response1.body.challenge_token).not.toBe(
			response2.body.challenge_token,
		);
	});

	it("should still require valid password before MFA challenge", async () => {
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: "WrongPassword123!",
			tenant_id: context.hospitalId,
		});

		expect(response.status).toBe(401);
		expect(response.body.mfa_required).toBeUndefined();
		expect(response.body.challenge_token).toBeUndefined();
	});
});

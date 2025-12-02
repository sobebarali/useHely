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

describe("POST /api/auth/token (grant_type: mfa) - MFA_FAILED Security Event", () => {
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

	it("should emit MFA_FAILED security event when invalid code is provided during login", async () => {
		// Clean up any existing security events
		await cleanupSecurityEventsForUser(context.userId);

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

		// Submit invalid MFA code
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: "000000",
		});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_MFA_CODE");

		// Wait for and verify security event
		const event = await waitForSecurityEvent("MFA_FAILED", context.userId);

		expect(event).toBeDefined();
		expect(event).toHaveProperty("type", "MFA_FAILED");
		expect(event).toHaveProperty("severity", "medium");
		expect(event).toHaveProperty("userId", context.userId);
		expect(event).toHaveProperty("tenantId", context.hospitalId);
		expect(event).toHaveProperty(
			"details.reason",
			"Invalid TOTP or backup code during login",
		);
	});

	it("should emit separate MFA_FAILED events for multiple failed attempts", async () => {
		// Clean up any existing security events
		await cleanupSecurityEventsForUser(context.userId);

		// Get first MFA challenge
		const challengeResponse1 = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		expect(challengeResponse1.status).toBe(200);
		const challengeToken1 = challengeResponse1.body.challenge_token;

		// First failed MFA attempt
		const response1 = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken1,
			code: "111111",
		});

		expect(response1.status).toBe(400);

		// Wait for first event
		const event1 = await waitForSecurityEvent("MFA_FAILED", context.userId);
		expect(event1).toBeDefined();
		expect(event1).toHaveProperty("type", "MFA_FAILED");

		// Clean up events for next test
		await cleanupSecurityEventsForUser(context.userId);

		// Get second MFA challenge (after first one was consumed)
		const challengeResponse2 = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		expect(challengeResponse2.status).toBe(200);
		const challengeToken2 = challengeResponse2.body.challenge_token;

		// Second failed MFA attempt
		const response2 = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken2,
			code: "222222",
		});

		expect(response2.status).toBe(400);

		// Wait for second event
		const event2 = await waitForSecurityEvent("MFA_FAILED", context.userId);
		expect(event2).toBeDefined();
		expect(event2).toHaveProperty("type", "MFA_FAILED");
	});

	it("should include IP address in MFA_FAILED security event", async () => {
		// Clean up any existing security events
		await cleanupSecurityEventsForUser(context.userId);

		// Get MFA challenge
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		expect(challengeResponse.status).toBe(200);
		const challengeToken = challengeResponse.body.challenge_token;

		// Submit invalid MFA code with custom IP
		const response = await request(app)
			.post("/api/auth/token")
			.set("X-Forwarded-For", "192.168.1.100")
			.send({
				grant_type: "mfa",
				challenge_token: challengeToken,
				code: "333333",
			});

		expect(response.status).toBe(400);

		// Wait for security event
		const event = await waitForSecurityEvent("MFA_FAILED", context.userId);

		expect(event).toBeDefined();
		expect(event).toHaveProperty("type", "MFA_FAILED");
		// IP should be captured from X-Forwarded-For or the request
		expect(event).toHaveProperty("ip");
	});
});

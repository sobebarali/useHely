import { User } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/auth/mfa/enable - Already Enabled", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let initialSecret: string;

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

		// First, enable MFA for this user
		const enableResponse = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(enableResponse.status).toBe(200);
		initialSecret = enableResponse.body.data.secret;

		// Verify the code to fully enable MFA
		const speakeasy = await import("speakeasy");
		const validCode = speakeasy.totp({
			secret: initialSecret,
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

	it("should return 409 error if MFA is already enabled", async () => {
		const response = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(409);
		expect(response.body.code).toBe("MFA_ALREADY_ENABLED");
	});

	it("should not generate new codes when MFA already enabled", async () => {
		const response = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(409);

		// Verify no new secret or backup codes are returned
		expect(response.body.data).toBeUndefined();

		// Verify existing config is unchanged in database
		const user = await User.findById(context.userId).lean();
		expect(user?.mfaConfig?.enabled).toBe(true);
		expect(user?.mfaConfig?.backupCodes).toHaveLength(10);
	});

	it("should include helpful message in error response", async () => {
		const response = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(409);
		expect(response.body.message).toContain("already enabled");
	});
});

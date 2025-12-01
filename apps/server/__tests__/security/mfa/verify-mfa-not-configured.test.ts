import { User } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/auth/mfa/verify - Not Configured", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create test context - without enabling MFA
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["ROLE:READ"],
			createStaff: true,
		});

		// Get access token
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Ensure no MFA config exists
		await User.findByIdAndUpdate(context.userId, {
			$unset: { mfaConfig: 1 },
		});
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("should return 400 error if enable not called first", async () => {
		const response = await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: "123456" });

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("MFA_NOT_CONFIGURED");
	});

	it("should include helpful message in error response", async () => {
		const response = await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: "123456" });

		expect(response.status).toBe(400);
		expect(response.body.message).toContain("/mfa/enable");
	});

	it("should not create any MFA config after failed verification", async () => {
		await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: "123456" });

		// Verify no MFA config was created
		const user = await User.findById(context.userId).lean();
		expect(user?.mfaConfig).toBeUndefined();
	});
});

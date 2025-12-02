import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/billing/checkout - Forbidden", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create user without BILLING:MANAGE permission
		context = await createAuthTestContext({
			roleName: "DOCTOR",
			rolePermissions: ["PATIENT:READ", "PRESCRIPTION:CREATE"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 403 when user lacks BILLING:MANAGE permission", async () => {
		const response = await request(app)
			.get("/api/billing/checkout")
			.query({ plan: "STARTER" })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(403);
		expect(response.body).toHaveProperty("code");
	});
});

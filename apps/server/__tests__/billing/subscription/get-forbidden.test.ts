import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/billing/subscription - Forbidden", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create user without SUBSCRIPTION:READ permission
		context = await createAuthTestContext({
			roleName: "RECEPTIONIST",
			rolePermissions: ["PATIENT:READ", "APPOINTMENT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 403 when user lacks SUBSCRIPTION:READ permission", async () => {
		const response = await request(app)
			.get("/api/billing/subscription")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(403);
		expect(response.body).toHaveProperty("code");
	});
});

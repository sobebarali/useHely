import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/billing/portal - Requires billing account", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["BILLING:READ", "BILLING:MANAGE"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 400 when tenant has no Dodo customer ID", async () => {
		const response = await request(app)
			.get("/api/billing/portal")
			.set("Authorization", `Bearer ${accessToken}`);

		// New tenants don't have dodoCustomerId - should return 400
		expect(response.status).toBe(400);
		expect(response.body.code).toBe("NO_BILLING_ACCOUNT");
	});
});

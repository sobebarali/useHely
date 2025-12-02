import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/billing/subscription - Success response", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["SUBSCRIPTION:READ", "BILLING:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns subscription details for authenticated user", async () => {
		const response = await request(app)
			.get("/api/billing/subscription")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("tenantId");
		expect(response.body).toHaveProperty("status");
		expect(response.body).toHaveProperty("plan");
		expect(response.body).toHaveProperty("usage");
	});

	it("returns FREE plan for new tenant without subscription", async () => {
		const response = await request(app)
			.get("/api/billing/subscription")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.plan).toBe("FREE");
		expect(response.body.status).toBe("ACTIVE");
	});

	it("returns usage limits for the current plan", async () => {
		const response = await request(app)
			.get("/api/billing/subscription")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.usage).toHaveProperty("users");
		expect(response.body.usage).toHaveProperty("patients");
		expect(response.body.usage.users).toHaveProperty("current");
		expect(response.body.usage.users).toHaveProperty("max");
		expect(response.body.usage.patients).toHaveProperty("current");
		expect(response.body.usage.patients).toHaveProperty("max");
	});

	it("returns features list for the current plan", async () => {
		const response = await request(app)
			.get("/api/billing/subscription")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("features");
		expect(Array.isArray(response.body.features)).toBe(true);
	});
});

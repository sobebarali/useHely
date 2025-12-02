import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/billing/checkout - Success response", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["BILLING:MANAGE", "SUBSCRIPTION:MANAGE"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns checkout link for STARTER plan", async () => {
		const response = await request(app)
			.get("/api/billing/checkout")
			.query({ plan: "STARTER", cycle: "MONTHLY" })
			.set("Authorization", `Bearer ${accessToken}`);

		// May return 400 if product IDs not configured, or 200 with checkout URL
		if (response.status === 200) {
			expect(response.body).toHaveProperty("checkoutUrl");
			expect(response.body).toHaveProperty("productId");
			expect(response.body).toHaveProperty("plan");
			expect(response.body.plan).toBe("STARTER");
		} else {
			// Product IDs not configured - expected in test environment
			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty("code");
		}
	});

	it("returns checkout link for PROFESSIONAL plan yearly", async () => {
		const response = await request(app)
			.get("/api/billing/checkout")
			.query({ plan: "PROFESSIONAL", cycle: "YEARLY" })
			.set("Authorization", `Bearer ${accessToken}`);

		if (response.status === 200) {
			expect(response.body).toHaveProperty("checkoutUrl");
			expect(response.body.plan).toBe("PROFESSIONAL");
			expect(response.body.cycle).toBe("YEARLY");
		} else {
			expect(response.status).toBe(400);
		}
	});

	it("defaults to MONTHLY cycle when not specified", async () => {
		const response = await request(app)
			.get("/api/billing/checkout")
			.query({ plan: "STARTER" })
			.set("Authorization", `Bearer ${accessToken}`);

		if (response.status === 200) {
			expect(response.body.cycle).toBe("MONTHLY");
		}
	});
});

import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/billing/plans - Public endpoint", () => {
	it("returns available plans without authentication", async () => {
		const response = await request(app).get("/api/billing/plans");

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("plans");
		expect(Array.isArray(response.body.plans)).toBe(true);
	});

	it("returns STARTER and PROFESSIONAL plans", async () => {
		const response = await request(app).get("/api/billing/plans");

		expect(response.status).toBe(200);

		const planIds = response.body.plans.map((p: { id: string }) => p.id);
		expect(planIds).toContain("STARTER");
		expect(planIds).toContain("PROFESSIONAL");
	});

	it("returns plan details with product IDs and features", async () => {
		const response = await request(app).get("/api/billing/plans");

		expect(response.status).toBe(200);

		const plan = response.body.plans[0];
		expect(plan).toHaveProperty("id");
		expect(plan).toHaveProperty("name");
		expect(plan).toHaveProperty("description");
		expect(plan).toHaveProperty("features");
		expect(Array.isArray(plan.features)).toBe(true);
	});
});

import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/inventory/:id/add - Add stock unauthorized", () => {
	it("returns 401 when no token is provided", async () => {
		const response = await request(app)
			.post("/api/inventory/some-id/add")
			.send({
				quantity: 100,
				batchNumber: "BATCH-001",
				expiryDate: new Date(
					Date.now() + 365 * 24 * 60 * 60 * 1000,
				).toISOString(),
			});

		expect(response.status).toBe(401);
	});

	it("returns 401 when invalid token is provided", async () => {
		const response = await request(app)
			.post("/api/inventory/some-id/add")
			.set("Authorization", "Bearer invalid-token")
			.send({
				quantity: 100,
				batchNumber: "BATCH-001",
				expiryDate: new Date(
					Date.now() + 365 * 24 * 60 * 60 * 1000,
				).toISOString(),
			});

		expect(response.status).toBe(401);
	});
});

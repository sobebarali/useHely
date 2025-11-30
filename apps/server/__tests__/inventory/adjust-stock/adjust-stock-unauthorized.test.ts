import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/inventory/:id/adjust - Unauthorized", () => {
	it("returns 401 without authentication token", async () => {
		const response = await request(app)
			.post("/api/inventory/some-inventory-id/adjust")
			.send({
				adjustment: 10,
				reason: "CORRECTION",
			});

		expect(response.status).toBe(401);
	});

	it("returns 401 with invalid token", async () => {
		const response = await request(app)
			.post("/api/inventory/some-inventory-id/adjust")
			.set("Authorization", "Bearer invalid-token")
			.send({
				adjustment: 10,
				reason: "CORRECTION",
			});

		expect(response.status).toBe(401);
	});

	it("returns 401 with expired token", async () => {
		const expiredToken =
			"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid";

		const response = await request(app)
			.post("/api/inventory/some-inventory-id/adjust")
			.set("Authorization", `Bearer ${expiredToken}`)
			.send({
				adjustment: 10,
				reason: "CORRECTION",
			});

		expect(response.status).toBe(401);
	});
});

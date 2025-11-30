import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/inventory/low-stock - Unauthorized", () => {
	it("returns 401 without authentication token", async () => {
		const response = await request(app).get("/api/inventory/low-stock");

		expect(response.status).toBe(401);
	});

	it("returns 401 with invalid token", async () => {
		const response = await request(app)
			.get("/api/inventory/low-stock")
			.set("Authorization", "Bearer invalid-token");

		expect(response.status).toBe(401);
	});

	it("returns 401 with expired token", async () => {
		const expiredToken =
			"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid";

		const response = await request(app)
			.get("/api/inventory/low-stock")
			.set("Authorization", `Bearer ${expiredToken}`);

		expect(response.status).toBe(401);
	});
});

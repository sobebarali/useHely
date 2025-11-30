import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/reports/history - Unauthorized", () => {
	it("returns 401 when no auth token provided", async () => {
		const response = await request(app).get("/api/reports/history");

		expect(response.status).toBe(401);
		expect(response.body).toHaveProperty("code");
	});

	it("returns 401 when invalid auth token provided", async () => {
		const response = await request(app)
			.get("/api/reports/history")
			.set("Authorization", "Bearer invalid-token");

		expect(response.status).toBe(401);
		expect(response.body).toHaveProperty("code");
	});
});

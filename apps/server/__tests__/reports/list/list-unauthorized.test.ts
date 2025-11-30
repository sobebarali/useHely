import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/reports - Unauthorized", () => {
	it("returns 401 when no auth token provided", async () => {
		const response = await request(app).get("/api/reports");

		expect(response.status).toBe(401);
		expect(response.body).toHaveProperty("code");
	});

	it("returns 401 when invalid auth token provided", async () => {
		const response = await request(app)
			.get("/api/reports")
			.set("Authorization", "Bearer invalid-token");

		expect(response.status).toBe(401);
		expect(response.body).toHaveProperty("code");
	});
});

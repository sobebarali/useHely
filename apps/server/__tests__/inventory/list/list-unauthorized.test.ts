import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/inventory - List inventory unauthorized", () => {
	it("returns 401 when no token is provided", async () => {
		const response = await request(app).get("/api/inventory");

		expect(response.status).toBe(401);
	});

	it("returns 401 when invalid token is provided", async () => {
		const response = await request(app)
			.get("/api/inventory")
			.set("Authorization", "Bearer invalid-token");

		expect(response.status).toBe(401);
	});
});

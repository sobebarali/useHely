import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/compliance/requests - List requests unauthorized", () => {
	it("returns 401 when no token provided", async () => {
		const response = await request(app).get("/api/compliance/requests");

		expect(response.status).toBe(401);
		expect(response.body.code).toBeDefined();
	});

	it("returns 401 when invalid token provided", async () => {
		const response = await request(app)
			.get("/api/compliance/requests")
			.set("Authorization", "Bearer invalid-token-here");

		expect(response.status).toBe(401);
		expect(response.body.code).toBeDefined();
	});
});

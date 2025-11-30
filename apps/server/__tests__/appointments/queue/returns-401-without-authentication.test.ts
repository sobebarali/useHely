import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/appointments/queue - Returns 401 without authentication", () => {
	it("returns 401 when no authorization header is provided", async () => {
		const response = await request(app).get("/api/appointments/queue");

		expect(response.status).toBe(401);
	});

	it("returns 401 when invalid token is provided", async () => {
		const response = await request(app)
			.get("/api/appointments/queue")
			.set("Authorization", "Bearer invalid-token");

		expect(response.status).toBe(401);
	});
});

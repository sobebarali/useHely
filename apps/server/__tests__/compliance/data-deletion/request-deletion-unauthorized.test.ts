import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/compliance/data-deletion - Unauthorized", () => {
	it("returns 401 without authentication", async () => {
		const response = await request(app)
			.post("/api/compliance/data-deletion")
			.send({
				confirmEmail: "test@example.com",
				reason: "Testing unauthorized access",
			});

		expect(response.status).toBe(401);
	});

	it("returns 401 with invalid token", async () => {
		const response = await request(app)
			.post("/api/compliance/data-deletion")
			.set("Authorization", "Bearer invalid-token")
			.send({
				confirmEmail: "test@example.com",
				reason: "Testing unauthorized access",
			});

		expect(response.status).toBe(401);
	});
});

import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/compliance/consent/:purpose/history - Unauthorized", () => {
	it("returns 401 without authentication", async () => {
		const response = await request(app).get(
			"/api/compliance/consent/marketing_emails/history",
		);

		expect(response.status).toBe(401);
	});

	it("returns 401 with invalid token", async () => {
		const response = await request(app)
			.get("/api/compliance/consent/marketing_emails/history")
			.set("Authorization", "Bearer invalid-token");

		expect(response.status).toBe(401);
	});
});

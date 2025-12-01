import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/compliance/data-deletion/:requestId - Unauthorized", () => {
	it("returns 401 without authentication", async () => {
		const requestId = uuidv4();

		const response = await request(app).get(
			`/api/compliance/data-deletion/${requestId}`,
		);

		expect(response.status).toBe(401);
	});

	it("returns 401 with invalid token", async () => {
		const requestId = uuidv4();

		const response = await request(app)
			.get(`/api/compliance/data-deletion/${requestId}`)
			.set("Authorization", "Bearer invalid-token");

		expect(response.status).toBe(401);
	});
});

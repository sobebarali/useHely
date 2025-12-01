import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/compliance/data-deletion/:requestId/verify - Unauthorized", () => {
	it("returns 401 without authentication", async () => {
		const requestId = uuidv4();

		const response = await request(app)
			.post(`/api/compliance/data-deletion/${requestId}/verify`)
			.send({
				token: "some-token",
			});

		expect(response.status).toBe(401);
	});

	it("returns 401 with invalid token", async () => {
		const requestId = uuidv4();

		const response = await request(app)
			.post(`/api/compliance/data-deletion/${requestId}/verify`)
			.set("Authorization", "Bearer invalid-token")
			.send({
				token: "some-token",
			});

		expect(response.status).toBe(401);
	});
});

import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("PUT /api/compliance/consent/:id/withdraw - Unauthorized", () => {
	it("returns 401 without authentication", async () => {
		const consentId = uuidv4();

		const response = await request(app).put(
			`/api/compliance/consent/${consentId}/withdraw`,
		);

		expect(response.status).toBe(401);
	});

	it("returns 401 with invalid token", async () => {
		const consentId = uuidv4();

		const response = await request(app)
			.put(`/api/compliance/consent/${consentId}/withdraw`)
			.set("Authorization", "Bearer invalid-token");

		expect(response.status).toBe(401);
	});
});

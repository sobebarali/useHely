import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("PUT /api/compliance/requests/:requestId/process - Unauthorized", () => {
	it("returns 401 when no token provided", async () => {
		const requestId = uuidv4();

		const response = await request(app)
			.put(`/api/compliance/requests/${requestId}/process`)
			.send({
				action: "approve",
			});

		expect(response.status).toBe(401);
		expect(response.body.code).toBeDefined();
	});

	it("returns 401 when invalid token provided", async () => {
		const requestId = uuidv4();

		const response = await request(app)
			.put(`/api/compliance/requests/${requestId}/process`)
			.set("Authorization", "Bearer invalid-token-here")
			.send({
				action: "approve",
			});

		expect(response.status).toBe(401);
		expect(response.body.code).toBeDefined();
	});
});

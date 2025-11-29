import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/auth/revoke - Invalid authorization format", () => {
	it("treats malformed bearer headers as invalid sessions", async () => {
		const response = await request(app)
			.post("/api/auth/revoke")
			.set("Authorization", "Bearer")
			.send({
				token: "any-token",
			});

		expect(response.status).toBe(401);
		expect(response.body).toMatchObject({
			code: "TOKEN_EXPIRED",
			message: "Session not found or has expired",
		});
	});
});

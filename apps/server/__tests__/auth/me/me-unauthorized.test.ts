import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/auth/me - Unauthorized access", () => {
	it("requires authentication header", async () => {
		const response = await request(app).get("/api/auth/me");

		expect(response.status).toBe(401);
		expect(response.body).toMatchObject({
			code: "UNAUTHORIZED",
			message: "No authorization token provided",
		});
	});
});

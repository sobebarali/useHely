import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/auth/tenants - List user tenants failure", () => {
	it("should return 401 for unauthenticated request", async () => {
		const response = await request(app).get("/api/auth/tenants");

		expect(response.status).toBe(401);
		// Middleware returns UNAUTHORIZED when no token is provided
		expect(response.body.code).toBe("UNAUTHORIZED");
	});

	it("should return 401 for invalid token", async () => {
		const response = await request(app)
			.get("/api/auth/tenants")
			.set("Authorization", "Bearer invalid-token-here");

		expect(response.status).toBe(401);
		// Middleware returns TOKEN_EXPIRED for non-existent/invalid tokens
		expect(response.body.code).toBe("TOKEN_EXPIRED");
	});

	it("should return 401 for malformed authorization header", async () => {
		const response = await request(app)
			.get("/api/auth/tenants")
			.set("Authorization", "NotBearer some-token");

		expect(response.status).toBe(401);
		// Middleware returns TOKEN_EXPIRED for malformed authorization headers
		expect(response.body.code).toBe("TOKEN_EXPIRED");
	});
});

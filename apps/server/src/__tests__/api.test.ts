import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../index";

describe("Server Health Check", () => {
	it("should return 200 OK on GET /", async () => {
		const response = await request(app).get("/");

		expect(response.status).toBe(200);
		expect(response.text).toBe("OK");
	});
});

describe("API Auth Endpoints", () => {
	it("should respond to auth endpoints", async () => {
		const response = await request(app).get("/api/auth/session");

		// The endpoint should respond (better-auth will handle the response)
		expect(response.status).toBeGreaterThanOrEqual(200);
		expect(response.status).toBeLessThan(500);
	});
});

describe("CORS Configuration", () => {
	it("should have CORS headers configured", async () => {
		const response = await request(app)
			.options("/")
			.set("Origin", "http://example.com");

		expect(response.headers["access-control-allow-methods"]).toBeDefined();
	});
});

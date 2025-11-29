import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/auth/token - Invalid Grant", () => {
	it("should reject unsupported grant type", async () => {
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "client_credentials",
			client_id: "test-client",
			client_secret: "test-secret",
		});

		expect(response.status).toBe(400);
		expect(response.body).toMatchObject({
			code: "INVALID_REQUEST",
			message: "Validation failed",
		});
		expect(response.body.errors?.[0]?.path).toContain("grant_type");
	});

	it("should reject missing grant type", async () => {
		const response = await request(app).post("/api/auth/token").send({
			username: "test@test.com",
			password: "test123",
			tenant_id: "test-tenant",
		});

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("code", "INVALID_REQUEST");
	});

	it("should reject authorization code grant (not implemented)", async () => {
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "authorization_code",
			code: "test-auth-code",
			redirect_uri: "https://test.com/callback",
			client_id: "test-client",
		});

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("code", "INVALID_GRANT");
		expect(response.body).toHaveProperty(
			"message",
			"Authorization code grant is not yet supported",
		);
	});

	it("should reject empty request body", async () => {
		const response = await request(app).post("/api/auth/token").send({});

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("code", "INVALID_REQUEST");
	});

	it("should reject malformed grant type", async () => {
		const response = await request(app).post("/api/auth/token").send({
			grant_type: 123, // Should be string
			username: "test@test.com",
			password: "test123",
			tenant_id: "test-tenant",
		});

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("code", "INVALID_REQUEST");
	});
});

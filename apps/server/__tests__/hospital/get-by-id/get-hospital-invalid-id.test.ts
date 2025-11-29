import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/hospitals/:id - Invalid hospital ID format", () => {
	let authContext: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create auth context with TENANT:READ permission
		authContext = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["TENANT:READ"],
		});

		// Get access token
		const tokens = await authContext.issuePasswordTokens();
		accessToken = tokens.accessToken;
	});

	afterAll(async () => {
		await authContext.cleanup();
	});

	it("should return 404 for malformed UUID format", async () => {
		const invalidId = "not-a-valid-uuid-format";

		const response = await request(app)
			.get(`/api/hospitals/${invalidId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
	});

	it("should return 404 for numeric ID", async () => {
		const numericId = "12345";

		const response = await request(app)
			.get(`/api/hospitals/${numericId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
	});

	it("should return 404 for ID with special characters", async () => {
		const specialCharId = "abc@#$%^&*()";

		const response = await request(app)
			.get(`/api/hospitals/${encodeURIComponent(specialCharId)}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
	});

	it("should return 404 for very long ID string", async () => {
		const longId = "a".repeat(1000);

		const response = await request(app)
			.get(`/api/hospitals/${longId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
	});
});

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PATCH /api/hospitals/:id - Invalid hospital ID format", () => {
	let authContext: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create auth context with TENANT:UPDATE permission
		authContext = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["TENANT:READ", "TENANT:UPDATE"],
		});

		// Get access token
		const tokens = await authContext.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await authContext.cleanup();
	});

	it("should return 400 when hospital ID is invalid", async () => {
		const invalidId = "invalid-id-format";
		const updateData = {
			name: "Updated Hospital Name",
		};

		const response = await request(app)
			.patch(`/api/hospitals/${invalidId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(updateData);

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("code");
		expect(response.body.code).toBe("INVALID_REQUEST");
		expect(response.body).toHaveProperty("errors");
	});

	it("should return 400 when hospital ID is in wrong format", async () => {
		const updateData = {
			name: "Updated Hospital Name",
		};

		const response = await request(app)
			.patch("/api/hospitals/123-456")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(updateData);

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("code");
		expect(response.body.code).toBe("INVALID_REQUEST");
	});
});

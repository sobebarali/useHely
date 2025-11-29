import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PATCH /api/hospitals/:id/status - Invalid hospital ID format", () => {
	let authContext: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create auth context with TENANT:MANAGE permission
		authContext = await createAuthTestContext({
			roleName: "SUPER_ADMIN",
			rolePermissions: ["TENANT:READ", "TENANT:UPDATE", "TENANT:MANAGE"],
		});

		// Get access token
		const tokens = await authContext.issuePasswordTokens();
		accessToken = tokens.accessToken;
	});

	afterAll(async () => {
		await authContext.cleanup();
	});

	it("should return 400 when hospital ID is not a valid UUID", async () => {
		const invalidHospitalId = "invalid-id-123";
		const statusUpdate = {
			status: "ACTIVE",
		};

		const response = await request(app)
			.patch(`/api/hospitals/${invalidHospitalId}/status`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(statusUpdate);

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("errors");
	});

	it("should return 404 when hospital ID is empty", async () => {
		const statusUpdate = {
			status: "ACTIVE",
		};

		const response = await request(app)
			.patch("/api/hospitals//status")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(statusUpdate);

		expect(response.status).toBe(404); // Empty ID will not match the route pattern
	});
});

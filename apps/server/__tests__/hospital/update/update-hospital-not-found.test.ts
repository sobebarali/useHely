import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PATCH /api/hospitals/:id - Hospital not found", () => {
	const nonExistentId = "507f1f77-bcf8-4cd7-9943-9011aaaaaaaa"; // Valid UUID v4 format
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
	});

	afterAll(async () => {
		await authContext.cleanup();
	});

	it("should return 404 when hospital does not exist", async () => {
		const updateData = {
			name: "Updated Hospital Name",
			contactEmail: "updated@hospital.com",
		};

		const response = await request(app)
			.patch(`/api/hospitals/${nonExistentId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(updateData);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("code");
		expect(response.body.code).toBe("NOT_FOUND");
		expect(response.body).toHaveProperty("message");
		expect(response.body.message).toBe("Hospital not found");
	});
});

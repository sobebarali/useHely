import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PATCH /api/hospitals/:id/status - Hospital not found", () => {
	const nonExistentHospitalId = uuidv4();
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

	it("should return 404 when hospital does not exist", async () => {
		const statusUpdate = {
			status: "ACTIVE",
		};

		const response = await request(app)
			.patch(`/api/hospitals/${nonExistentHospitalId}/status`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(statusUpdate);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("code");
		expect(response.body.code).toBe("NOT_FOUND");
		expect(response.body).toHaveProperty("message");
		expect(response.body.message).toContain("Hospital not found");
	});
});

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/hospitals/:id - Successfully retrieve hospital by ID", () => {
	let authContext: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create auth context with TENANT:READ permission
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

	it("should successfully retrieve hospital details by ID", async () => {
		const response = await request(app)
			.get(`/api/hospitals/${authContext.hospitalId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("id");
		expect(response.body.id).toBe(authContext.hospitalId);
		expect(response.body).toHaveProperty("tenantId");
		expect(response.body).toHaveProperty("name");
		expect(response.body.name).toContain("Test Hospital");
		expect(response.body).toHaveProperty("address");
		expect(response.body.address).toHaveProperty("street");
		expect(response.body.address).toHaveProperty("city");
		expect(response.body).toHaveProperty("contactEmail");
		expect(response.body).toHaveProperty("contactPhone");
		expect(response.body).toHaveProperty("status");
		expect(response.body).toHaveProperty("createdAt");
		expect(response.body).toHaveProperty("updatedAt");

		// Verify the data matches
		expect(response.body.address.street).toBe("123 Test St");
		expect(response.body.address.city).toBe("Test City");
	});
});

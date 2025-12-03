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
		expect(response.body).toHaveProperty("success", true);
		expect(response.body).toHaveProperty("data");
		expect(response.body.data).toHaveProperty("id");
		expect(response.body.data.id).toBe(authContext.hospitalId);
		expect(response.body.data).toHaveProperty("tenantId");
		expect(response.body.data).toHaveProperty("name");
		expect(response.body.data.name).toContain("Test Hospital");
		expect(response.body.data).toHaveProperty("address");
		expect(response.body.data.address).toHaveProperty("street");
		expect(response.body.data.address).toHaveProperty("city");
		expect(response.body.data).toHaveProperty("contactEmail");
		expect(response.body.data).toHaveProperty("contactPhone");
		expect(response.body.data).toHaveProperty("status");
		expect(response.body.data).toHaveProperty("createdAt");
		expect(response.body.data).toHaveProperty("updatedAt");

		// Verify the data matches
		expect(response.body.data.address.street).toBe("123 Test St");
		expect(response.body.data.address.city).toBe("Test City");
	});
});

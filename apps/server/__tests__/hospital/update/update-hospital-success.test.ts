import { Hospital } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PATCH /api/hospitals/:id - Successfully update hospital", () => {
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

	it("should successfully update hospital with valid data", async () => {
		const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
		const updateData = {
			name: `Updated Hospital ${uniqueId}`,
			contactEmail: `updated-${uniqueId}@testhospital.com`,
			contactPhone: "+9999999999",
			address: {
				street: "456 Updated St",
				city: "Los Angeles",
				state: "CA",
				postalCode: "90001",
				country: "USA",
			},
		};

		const response = await request(app)
			.patch(`/api/hospitals/${authContext.hospitalId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(updateData);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("id");
		expect(response.body.id).toBe(authContext.hospitalId);
		expect(response.body.name).toBe(updateData.name);
		expect(response.body.contactEmail).toBe(updateData.contactEmail);
		expect(response.body.contactPhone).toBe(updateData.contactPhone);
		expect(response.body.address.street).toBe(updateData.address.street);
		expect(response.body.address.city).toBe(updateData.address.city);
		expect(response.body).toHaveProperty("updatedAt");

		// Verify database entry
		const hospital = await Hospital.findById(authContext.hospitalId);
		expect(hospital).toBeDefined();
		expect(hospital?.name).toBe(updateData.name);
		expect(hospital?.contactEmail).toBe(updateData.contactEmail);
		expect(hospital?.contactPhone).toBe(updateData.contactPhone);
	});
});

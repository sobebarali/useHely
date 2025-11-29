import { Hospital } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PATCH /api/hospitals/:id - License number immutability", () => {
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

	it("should reject update when trying to modify license number", async () => {
		// Get original license number
		const originalHospital = await Hospital.findById(authContext.hospitalId);
		const originalLicenseNumber = originalHospital?.licenseNumber;

		const updateData = {
			name: "Updated Hospital Name",
			licenseNumber: "NEW-LICENSE-123",
		};

		const response = await request(app)
			.patch(`/api/hospitals/${authContext.hospitalId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(updateData);

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("errors");

		// Verify license number hasn't changed in database
		const hospital = await Hospital.findById(authContext.hospitalId);
		expect(hospital?.licenseNumber).toBe(originalLicenseNumber);
	});
});

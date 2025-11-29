import { Patient } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/patients/:id - Unauthorized access", () => {
	let contextWithPermission: AuthTestContext;
	let contextWithoutPermission: AuthTestContext;
	let accessTokenWithPermission: string;
	let accessTokenWithoutPermission: string;
	let createdPatientId: string;

	beforeAll(async () => {
		// Create context WITH PATIENT:READ permission to create test data
		contextWithPermission = await createAuthTestContext({
			rolePermissions: ["PATIENT:CREATE", "PATIENT:READ"],
			includeDepartment: true,
		});
		const tokensWithPermission =
			await contextWithPermission.issuePasswordTokens();
		accessTokenWithPermission = tokensWithPermission.accessToken;

		// Create a test patient
		const payload = {
			firstName: "Unauthorized",
			lastName: "Test",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "MALE",
			phone: `+1-unauth-get-${contextWithPermission.uniqueId}`,
			address: {
				street: "123 Main St",
				city: "Test City",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			emergencyContact: {
				name: "Jane Doe",
				relationship: "Spouse",
				phone: "+1-555-1234",
			},
			patientType: "OPD",
		};

		const response = await request(app)
			.post("/api/patients")
			.set("Authorization", `Bearer ${accessTokenWithPermission}`)
			.send(payload);

		createdPatientId = response.body.id;

		// Create context WITHOUT PATIENT:READ permission
		contextWithoutPermission = await createAuthTestContext({
			rolePermissions: ["PATIENT:UPDATE"], // No read permission
			includeDepartment: true,
		});
		const tokensWithoutPermission =
			await contextWithoutPermission.issuePasswordTokens();
		accessTokenWithoutPermission = tokensWithoutPermission.accessToken;
	}, 30000);

	afterAll(async () => {
		if (createdPatientId) {
			await Patient.deleteOne({ _id: createdPatientId });
		}
		await contextWithPermission.cleanup();
		await contextWithoutPermission.cleanup();
	});

	it("returns 403 when user lacks PATIENT:READ permission", async () => {
		const response = await request(app)
			.get(`/api/patients/${createdPatientId}`)
			.set("Authorization", `Bearer ${accessTokenWithoutPermission}`);

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});

	it("returns 401 when no authorization token is provided", async () => {
		const response = await request(app).get(
			`/api/patients/${createdPatientId}`,
		);

		expect(response.status).toBe(401);
		expect(response.body.code).toBe("UNAUTHORIZED");
	});
});

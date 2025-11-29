import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/patients - Unauthorized access", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create context WITHOUT PATIENT:CREATE permission
		context = await createAuthTestContext({
			rolePermissions: ["PATIENT:READ"], // Only read, no create
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 403 when user lacks PATIENT:CREATE permission", async () => {
		const payload = {
			firstName: "John",
			lastName: "Doe",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "MALE",
			phone: `+1-unauth-${context.uniqueId}`,
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
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});

	it("returns 401 when no authorization token is provided", async () => {
		const payload = {
			firstName: "John",
			lastName: "Doe",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "MALE",
			phone: `+1-noauth-${context.uniqueId}`,
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

		const response = await request(app).post("/api/patients").send(payload);

		expect(response.status).toBe(401);
		expect(response.body.code).toBe("UNAUTHORIZED");
	});
});

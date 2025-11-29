import { Patient } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/patients - Duplicate phone error", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let createdPatientId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["PATIENT:CREATE", "PATIENT:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create a patient first
		const payload = {
			firstName: "Existing",
			lastName: "Patient",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "MALE",
			phone: `+1-dup-${context.uniqueId}`,
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

		createdPatientId = response.body.id;
	}, 30000);

	afterAll(async () => {
		if (createdPatientId) {
			await Patient.deleteOne({ _id: createdPatientId });
		}
		await context.cleanup();
	});

	it("returns 409 when phone already exists in tenant", async () => {
		const payload = {
			firstName: "Another",
			lastName: "Patient",
			dateOfBirth: "1985-03-20T00:00:00.000Z",
			gender: "FEMALE",
			phone: `+1-dup-${context.uniqueId}`, // Same phone as existing patient
			address: {
				street: "456 Other St",
				city: "Other City",
				state: "OS",
				postalCode: "67890",
				country: "USA",
			},
			emergencyContact: {
				name: "John Smith",
				relationship: "Brother",
				phone: "+1-555-5678",
			},
			patientType: "IPD",
		};

		const response = await request(app)
			.post("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(409);
		expect(response.body.code).toBe("PHONE_EXISTS");
		expect(response.body.message).toContain("phone number already exists");
	});
});

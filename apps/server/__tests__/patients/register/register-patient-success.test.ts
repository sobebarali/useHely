import { Patient } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/patients - Register patient success", () => {
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
	}, 30000);

	afterAll(async () => {
		// Clean up created patient
		if (createdPatientId) {
			await Patient.deleteOne({ _id: createdPatientId });
		}
		await context.cleanup();
	});

	it("registers a new patient successfully", async () => {
		const payload = {
			firstName: "John",
			lastName: "Doe",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "MALE",
			bloodGroup: "A+",
			phone: `+1-${context.uniqueId}`,
			email: `patient-${context.uniqueId}@test.com`,
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
			department: context.departmentId,
		};

		const response = await request(app)
			.post("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("id");
		expect(response.body).toHaveProperty("patientId");
		expect(response.body.firstName).toBe("John");
		expect(response.body.lastName).toBe("Doe");
		expect(response.body.gender).toBe("MALE");
		expect(response.body.patientType).toBe("OPD");
		expect(response.body.status).toBe("ACTIVE");
		expect(response.body.patientId).toMatch(
			new RegExp(`^${context.hospitalId}-P-\\d+$`),
		);

		createdPatientId = response.body.id;
	});
});

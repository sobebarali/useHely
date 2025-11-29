import { Patient } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/patients/:id - Get patient success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let createdPatientId: string;
	let patientId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["PATIENT:CREATE", "PATIENT:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create a test patient
		const payload = {
			firstName: "GetTest",
			lastName: "Patient",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "FEMALE",
			bloodGroup: "B+",
			phone: `+1-get-${context.uniqueId}`,
			email: `get-${context.uniqueId}@test.com`,
			address: {
				street: "123 Main St",
				city: "Test City",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			emergencyContact: {
				name: "Emergency Contact",
				relationship: "Sibling",
				phone: "+1-555-0000",
			},
			patientType: "IPD",
			department: context.departmentId,
		};

		const response = await request(app)
			.post("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		createdPatientId = response.body.id;
		patientId = response.body.patientId;
	}, 30000);

	afterAll(async () => {
		if (createdPatientId) {
			await Patient.deleteOne({ _id: createdPatientId });
		}
		await context.cleanup();
	});

	it("gets patient by ID with full details", async () => {
		const response = await request(app)
			.get(`/api/patients/${createdPatientId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.id).toBe(createdPatientId);
		expect(response.body.patientId).toBe(patientId);
		expect(response.body.firstName).toBe("GetTest");
		expect(response.body.lastName).toBe("Patient");
		expect(response.body.gender).toBe("FEMALE");
		expect(response.body.bloodGroup).toBe("B+");
		expect(response.body.patientType).toBe("IPD");
		expect(response.body).toHaveProperty("age");
		expect(response.body).toHaveProperty("address");
		expect(response.body).toHaveProperty("emergencyContact");
		expect(response.body).toHaveProperty("department");
		expect(response.body.department).toBe(context.departmentName);
	});

	it("returns 404 for non-existent patient", async () => {
		const response = await request(app)
			.get("/api/patients/non-existent-id")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body.code).toBe("NOT_FOUND");
	});
});

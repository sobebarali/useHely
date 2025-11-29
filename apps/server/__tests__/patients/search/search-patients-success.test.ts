import { Patient } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/patients/search - Search patients success", () => {
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
			firstName: "SearchTest",
			lastName: "UniquePatient",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "MALE",
			phone: `+1-search-${context.uniqueId}`,
			email: `search-${context.uniqueId}@test.com`,
			address: {
				street: "123 Main St",
				city: "Test City",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			emergencyContact: {
				name: "Emergency Contact",
				relationship: "Family",
				phone: "+1-555-0000",
			},
			patientType: "OPD",
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

	it("searches patients by name", async () => {
		const response = await request(app)
			.get("/api/patients/search")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ q: "SearchTest" });

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("results");
		expect(response.body).toHaveProperty("count");
		expect(response.body.results.length).toBeGreaterThan(0);
		expect(response.body.results[0].firstName).toBe("SearchTest");
	});

	it("searches patients by patient ID", async () => {
		const response = await request(app)
			.get("/api/patients/search")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ q: patientId, type: "id" });

		expect(response.status).toBe(200);
		expect(response.body.results.length).toBe(1);
		expect(response.body.results[0].patientId).toBe(patientId);
	});

	it("returns 400 for query too short", async () => {
		const response = await request(app)
			.get("/api/patients/search")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ q: "a" });

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});
});

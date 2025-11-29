import { Patient } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/patients - List patients success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const createdPatientIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["PATIENT:CREATE", "PATIENT:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create some test patients
		for (let i = 0; i < 3; i++) {
			const payload = {
				firstName: `Test${i}`,
				lastName: `Patient${i}`,
				dateOfBirth: "1990-05-15T00:00:00.000Z",
				gender: i % 2 === 0 ? "MALE" : "FEMALE",
				phone: `+1-list-${context.uniqueId}-${i}`,
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
				patientType: i % 2 === 0 ? "OPD" : "IPD",
				department: context.departmentId,
			};

			const response = await request(app)
				.post("/api/patients")
				.set("Authorization", `Bearer ${accessToken}`)
				.send(payload);

			if (response.body.id) {
				createdPatientIds.push(response.body.id);
			}
		}
	}, 60000);

	afterAll(async () => {
		for (const id of createdPatientIds) {
			await Patient.deleteOne({ _id: id });
		}
		await context.cleanup();
	});

	it("lists patients with pagination", async () => {
		const response = await request(app)
			.get("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ page: 1, limit: 10 });

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("data");
		expect(response.body).toHaveProperty("pagination");
		expect(Array.isArray(response.body.data)).toBe(true);
		expect(response.body.pagination).toHaveProperty("page");
		expect(response.body.pagination).toHaveProperty("limit");
		expect(response.body.pagination).toHaveProperty("total");
		expect(response.body.pagination).toHaveProperty("totalPages");
	});

	it("filters patients by patient type", async () => {
		const response = await request(app)
			.get("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ patientType: "OPD" });

		expect(response.status).toBe(200);
		expect(response.body.data.length).toBeGreaterThan(0);
		for (const patient of response.body.data) {
			expect(patient.patientType).toBe("OPD");
		}
	});

	it("searches patients by name", async () => {
		const response = await request(app)
			.get("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ search: "Test0" });

		expect(response.status).toBe(200);
		expect(response.body.data.length).toBeGreaterThan(0);
	});
});

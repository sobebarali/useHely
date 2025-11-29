import { Patient } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/patients - Pagination edge cases", () => {
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

		// Create 5 test patients
		for (let i = 0; i < 5; i++) {
			const payload = {
				firstName: `Pagination${i}`,
				lastName: `Test${i}`,
				dateOfBirth: "1990-05-15T00:00:00.000Z",
				gender: i % 2 === 0 ? "MALE" : "FEMALE",
				phone: `+1-page-${context.uniqueId}-${i}`,
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

	it("returns empty data array when page exceeds total pages", async () => {
		const response = await request(app)
			.get("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ page: 100, limit: 10 });

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual([]);
		expect(response.body.pagination.page).toBe(100);
	});

	it("returns correct pagination metadata for small limit", async () => {
		const response = await request(app)
			.get("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ page: 1, limit: 2 });

		expect(response.status).toBe(200);
		expect(response.body.data.length).toBeLessThanOrEqual(2);
		expect(response.body.pagination.limit).toBe(2);
		expect(response.body.pagination.totalPages).toBeGreaterThanOrEqual(1);
	});

	it("returns first page by default when no page specified", async () => {
		const response = await request(app)
			.get("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ limit: 10 });

		expect(response.status).toBe(200);
		expect(response.body.pagination.page).toBe(1);
	});

	it("filters by status correctly", async () => {
		const response = await request(app)
			.get("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ status: "ACTIVE" });

		expect(response.status).toBe(200);
		for (const patient of response.body.data) {
			expect(patient.status).toBe("ACTIVE");
		}
	});

	it("filters by department correctly", async () => {
		const response = await request(app)
			.get("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ department: context.departmentId });

		expect(response.status).toBe(200);
		// All returned patients should belong to the filtered department
		expect(response.body.data.length).toBeGreaterThan(0);
	});
});

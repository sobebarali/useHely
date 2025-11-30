import { Patient } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/patients/export - Export patients success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const createdPatientIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["PATIENT:CREATE", "PATIENT:READ", "PATIENT:MANAGE"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create some test patients
		for (let i = 0; i < 3; i++) {
			const payload = {
				firstName: `Export${i}`,
				lastName: `Patient${i}`,
				dateOfBirth: "1990-05-15T00:00:00.000Z",
				gender: "MALE",
				phone: `+1-export-${context.uniqueId}-${i}`,
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

	it("exports patients to CSV format", async () => {
		const response = await request(app)
			.get("/api/patients/export")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ format: "csv" });

		expect(response.status).toBe(200);
		expect(response.headers["content-type"]).toContain("text/csv");
		expect(response.headers["content-disposition"]).toContain("attachment");
		expect(response.headers["content-disposition"]).toContain(".csv");

		// Verify CSV content has headers
		expect(response.text).toContain("patientId");
		expect(response.text).toContain("firstName");
		expect(response.text).toContain("lastName");
	});

	it("exports patients with specific fields", async () => {
		const response = await request(app)
			.get("/api/patients/export")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({
				format: "csv",
				fields: "patientId,firstName,lastName,phone",
			});

		expect(response.status).toBe(200);
		expect(response.text).toContain("patientId");
		expect(response.text).toContain("firstName");
		expect(response.text).toContain("lastName");
		expect(response.text).toContain("phone");
	});

	it("filters export by patient type", async () => {
		const response = await request(app)
			.get("/api/patients/export")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({
				format: "csv",
				patientType: "OPD",
			});

		expect(response.status).toBe(200);
		expect(response.text).toContain("OPD");
	});

	it("exports patients to PDF format", async () => {
		const response = await request(app)
			.get("/api/patients/export")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ format: "pdf" });

		expect(response.status).toBe(200);
		expect(response.headers["content-type"]).toContain("application/pdf");
		expect(response.headers["content-disposition"]).toContain("attachment");
		expect(response.headers["content-disposition"]).toContain(".pdf");

		// Verify it's a valid PDF (starts with %PDF magic bytes)
		expect(response.body).toBeInstanceOf(Buffer);
		const pdfHeader = response.body.slice(0, 4).toString();
		expect(pdfHeader).toBe("%PDF");
	});

	it("exports patients to PDF with specific fields", async () => {
		const response = await request(app)
			.get("/api/patients/export")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({
				format: "pdf",
				fields: "patientId,firstName,lastName",
			});

		expect(response.status).toBe(200);
		expect(response.headers["content-type"]).toContain("application/pdf");
		expect(response.body).toBeInstanceOf(Buffer);
	});
});

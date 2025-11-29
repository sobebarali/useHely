import { Patient } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("Patient API - Cross-tenant isolation", () => {
	let tenantA: AuthTestContext;
	let tenantB: AuthTestContext;
	let accessTokenA: string;
	let accessTokenB: string;
	let patientIdFromTenantA: string;

	beforeAll(async () => {
		// Create two separate tenants (hospitals)
		tenantA = await createAuthTestContext({
			rolePermissions: [
				"PATIENT:CREATE",
				"PATIENT:READ",
				"PATIENT:UPDATE",
				"PATIENT:MANAGE",
			],
			includeDepartment: true,
		});
		const tokensA = await tenantA.issuePasswordTokens();
		accessTokenA = tokensA.accessToken;

		tenantB = await createAuthTestContext({
			rolePermissions: [
				"PATIENT:CREATE",
				"PATIENT:READ",
				"PATIENT:UPDATE",
				"PATIENT:MANAGE",
			],
			includeDepartment: true,
		});
		const tokensB = await tenantB.issuePasswordTokens();
		accessTokenB = tokensB.accessToken;

		// Create a patient in Tenant A
		const payload = {
			firstName: "TenantA",
			lastName: "Patient",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "MALE",
			phone: `+1-tenant-a-${tenantA.uniqueId}`,
			email: `tenant-a-${tenantA.uniqueId}@test.com`,
			address: {
				street: "123 Tenant A St",
				city: "Tenant A City",
				state: "TA",
				postalCode: "12345",
				country: "USA",
			},
			emergencyContact: {
				name: "Emergency Contact A",
				relationship: "Family",
				phone: "+1-555-0001",
			},
			patientType: "OPD",
		};

		const response = await request(app)
			.post("/api/patients")
			.set("Authorization", `Bearer ${accessTokenA}`)
			.send(payload);

		patientIdFromTenantA = response.body.id;
	}, 60000);

	afterAll(async () => {
		if (patientIdFromTenantA) {
			await Patient.deleteOne({ _id: patientIdFromTenantA });
		}
		await tenantA.cleanup();
		await tenantB.cleanup();
	});

	describe("GET /api/patients/:id - Cross-tenant access prevention", () => {
		it("returns 404 when Tenant B tries to access Tenant A patient", async () => {
			const response = await request(app)
				.get(`/api/patients/${patientIdFromTenantA}`)
				.set("Authorization", `Bearer ${accessTokenB}`);

			// Should return 404 because the patient doesn't exist in Tenant B's scope
			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");
		});

		it("returns 200 when Tenant A accesses its own patient", async () => {
			const response = await request(app)
				.get(`/api/patients/${patientIdFromTenantA}`)
				.set("Authorization", `Bearer ${accessTokenA}`);

			expect(response.status).toBe(200);
			expect(response.body.id).toBe(patientIdFromTenantA);
		});
	});

	describe("PATCH /api/patients/:id - Cross-tenant modification prevention", () => {
		it("returns 404 when Tenant B tries to update Tenant A patient", async () => {
			const response = await request(app)
				.patch(`/api/patients/${patientIdFromTenantA}`)
				.set("Authorization", `Bearer ${accessTokenB}`)
				.send({ phone: "+1-hacked-phone" });

			// Should return 404 because the patient doesn't exist in Tenant B's scope
			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");
		});

		it("successfully updates when Tenant A updates its own patient", async () => {
			const newPhone = `+1-updated-${tenantA.uniqueId}`;
			const response = await request(app)
				.patch(`/api/patients/${patientIdFromTenantA}`)
				.set("Authorization", `Bearer ${accessTokenA}`)
				.send({ phone: newPhone });

			expect(response.status).toBe(200);
			expect(response.body.phone).toBe(newPhone);
		});
	});

	describe("GET /api/patients - Cross-tenant list isolation", () => {
		it("Tenant B list does not include Tenant A patients", async () => {
			const response = await request(app)
				.get("/api/patients")
				.set("Authorization", `Bearer ${accessTokenB}`)
				.query({ page: 1, limit: 100 });

			expect(response.status).toBe(200);

			// Verify no patient from Tenant A appears in Tenant B's list
			const patientIds = response.body.data.map((p: { id: string }) => p.id);
			expect(patientIds).not.toContain(patientIdFromTenantA);
		});

		it("Tenant A list includes its own patients", async () => {
			const response = await request(app)
				.get("/api/patients")
				.set("Authorization", `Bearer ${accessTokenA}`)
				.query({ page: 1, limit: 100 });

			expect(response.status).toBe(200);

			const patientIds = response.body.data.map((p: { id: string }) => p.id);
			expect(patientIds).toContain(patientIdFromTenantA);
		});
	});

	describe("GET /api/patients/search - Cross-tenant search isolation", () => {
		it("Tenant B search does not return Tenant A patients", async () => {
			const response = await request(app)
				.get("/api/patients/search")
				.set("Authorization", `Bearer ${accessTokenB}`)
				.query({ q: "TenantA" });

			expect(response.status).toBe(200);

			// Verify no patient from Tenant A appears in Tenant B's search
			const patientIds = response.body.results.map((p: { id: string }) => p.id);
			expect(patientIds).not.toContain(patientIdFromTenantA);
		});

		it("Tenant A search returns its own patients", async () => {
			const response = await request(app)
				.get("/api/patients/search")
				.set("Authorization", `Bearer ${accessTokenA}`)
				.query({ q: "TenantA" });

			expect(response.status).toBe(200);
			expect(response.body.results.length).toBeGreaterThan(0);
		});
	});

	describe("GET /api/patients/export - Cross-tenant export isolation", () => {
		it("Tenant B export does not include Tenant A patients", async () => {
			const response = await request(app)
				.get("/api/patients/export")
				.set("Authorization", `Bearer ${accessTokenB}`)
				.query({ format: "csv" });

			expect(response.status).toBe(200);

			// Verify Tenant A patient data is not in the export
			expect(response.text).not.toContain("TenantA");
			expect(response.text).not.toContain(patientIdFromTenantA);
		});

		it("Tenant A export includes its own patients", async () => {
			const response = await request(app)
				.get("/api/patients/export")
				.set("Authorization", `Bearer ${accessTokenA}`)
				.query({ format: "csv" });

			expect(response.status).toBe(200);
			expect(response.text).toContain("TenantA");
		});
	});
});

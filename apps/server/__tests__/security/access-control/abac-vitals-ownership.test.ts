import { Patient, Vitals } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("ABAC Policy - Vitals Ownership", () => {
	let adminContext: AuthTestContext;
	let adminAccessToken: string;

	let patientId: string;
	let vitalsId: string;

	beforeAll(async () => {
		// Create admin context
		adminContext = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: [
				"VITALS:READ",
				"VITALS:CREATE",
				"PATIENT:READ",
				"PATIENT:CREATE",
			],
			createStaff: true,
		});
		const adminTokens = await adminContext.issuePasswordTokens();
		adminAccessToken = adminTokens.accessToken;

		// Create patient in the tenant
		patientId = uuidv4();
		await Patient.create({
			_id: patientId,
			tenantId: adminContext.hospitalId,
			patientId: `PAT-${adminContext.uniqueId}`,
			firstName: "Test",
			lastName: "Patient",
			dateOfBirth: new Date("1990-01-01"),
			gender: "MALE",
			phone: `+1-${Date.now()}`,
			emergencyContact: {
				name: "Emergency Contact",
				relationship: "Spouse",
				phone: "+0987654321",
			},
			patientType: "OPD",
			assignedDoctorId: adminContext.userId,
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create vitals for the patient
		vitalsId = uuidv4();
		await Vitals.create({
			_id: vitalsId,
			tenantId: adminContext.hospitalId,
			patientId: patientId,
			temperature: { value: 98.6, unit: "FAHRENHEIT" },
			bloodPressure: { systolic: 120, diastolic: 80 },
			heartRate: 72,
			respiratoryRate: 16,
			oxygenSaturation: 98,
			recordedBy: adminContext.userId,
			recordedAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 60000);

	afterAll(async () => {
		await Vitals.deleteOne({ _id: vitalsId });
		await Patient.deleteOne({ _id: patientId });
		await adminContext.cleanup();
	});

	describe("Admin accessing vitals", () => {
		it("should allow admin to access vitals", async () => {
			const response = await request(app)
				.get(`/api/vitals/${vitalsId}`)
				.set("Authorization", `Bearer ${adminAccessToken}`);

			expect(response.status).toBe(200);
			expect(response.body.id).toBe(vitalsId);
		});
	});

	describe("Non-existent vitals", () => {
		it("should return 404 for non-existent vitals", async () => {
			const fakeVitalsId = uuidv4();

			const response = await request(app)
				.get(`/api/vitals/${fakeVitalsId}`)
				.set("Authorization", `Bearer ${adminAccessToken}`);

			expect(response.status).toBe(404);
		});
	});

	describe("Cross-tenant isolation", () => {
		it("should deny access to vitals from different tenant", async () => {
			const differentTenantContext = await createAuthTestContext({
				roleName: "HOSPITAL_ADMIN",
				rolePermissions: ["VITALS:READ"],
				createStaff: true,
			});
			const tokens = await differentTenantContext.issuePasswordTokens();

			const response = await request(app)
				.get(`/api/vitals/${vitalsId}`)
				.set("Authorization", `Bearer ${tokens.accessToken}`);

			// Should be 404 because vitals doesn't exist in their tenant
			expect(response.status).toBe(404);

			await differentTenantContext.cleanup();
		});
	});

	describe("Vitals data integrity", () => {
		it("should return vitals with correct data", async () => {
			const response = await request(app)
				.get(`/api/vitals/${vitalsId}`)
				.set("Authorization", `Bearer ${adminAccessToken}`);

			expect(response.status).toBe(200);
			expect(response.body.temperature.value).toBe(98.6);
			expect(response.body.bloodPressure.systolic).toBe(120);
			expect(response.body.bloodPressure.diastolic).toBe(80);
			expect(response.body.heartRate).toBe(72);
			expect(response.body.oxygenSaturation).toBe(98);
		});
	});
});

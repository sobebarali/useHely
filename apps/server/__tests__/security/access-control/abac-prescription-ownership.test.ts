import { Patient, Prescription } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("ABAC Policy - Prescription Ownership", () => {
	let adminContext: AuthTestContext;
	let adminAccessToken: string;

	let patientId: string;
	let prescriptionId: string;
	let otherDoctorPrescriptionId: string;

	beforeAll(async () => {
		// Create admin context - this establishes the shared tenant
		adminContext = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: [
				"PRESCRIPTION:READ",
				"PRESCRIPTION:CREATE",
				"PRESCRIPTION:UPDATE",
				"PATIENT:CREATE",
				"PATIENT:READ",
			],
			createStaff: true,
		});
		const adminTokens = await adminContext.issuePasswordTokens();
		adminAccessToken = adminTokens.accessToken;

		// Create a patient in the tenant
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
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create prescription by admin (acts as doctor)
		prescriptionId = uuidv4();
		await Prescription.create({
			_id: prescriptionId,
			tenantId: adminContext.hospitalId,
			prescriptionId: `RX-${adminContext.uniqueId}-1`,
			patientId: patientId,
			doctorId: adminContext.userId,
			diagnosis: "Test Diagnosis 1",
			medicines: [
				{
					name: "Medication A",
					dosage: "500mg",
					frequency: "Twice daily",
					duration: "7 days",
				},
			],
			status: "PENDING",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create prescription by a different doctor
		otherDoctorPrescriptionId = uuidv4();
		await Prescription.create({
			_id: otherDoctorPrescriptionId,
			tenantId: adminContext.hospitalId,
			prescriptionId: `RX-${adminContext.uniqueId}-2`,
			patientId: patientId,
			doctorId: "other-doctor-id",
			diagnosis: "Test Diagnosis 2",
			medicines: [
				{
					name: "Medication B",
					dosage: "250mg",
					frequency: "Once daily",
					duration: "14 days",
				},
			],
			status: "PENDING",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 60000);

	afterAll(async () => {
		// Cleanup prescriptions and patient
		await Prescription.deleteMany({
			_id: { $in: [prescriptionId, otherDoctorPrescriptionId] },
		});
		await Patient.deleteOne({ _id: patientId });

		await adminContext.cleanup();
	});

	describe("Admin accessing prescriptions", () => {
		it("should allow admin to access any prescription", async () => {
			// Access own prescription
			const response1 = await request(app)
				.get(`/api/prescriptions/${prescriptionId}`)
				.set("Authorization", `Bearer ${adminAccessToken}`);

			expect(response1.status).toBe(200);
			expect(response1.body.id).toBe(prescriptionId);

			// Access other doctor's prescription
			const response2 = await request(app)
				.get(`/api/prescriptions/${otherDoctorPrescriptionId}`)
				.set("Authorization", `Bearer ${adminAccessToken}`);

			expect(response2.status).toBe(200);
			expect(response2.body.id).toBe(otherDoctorPrescriptionId);
		});
	});

	describe("Non-existent prescription", () => {
		it("should return 404 for non-existent prescription", async () => {
			const fakePrescriptionId = uuidv4();

			const response = await request(app)
				.get(`/api/prescriptions/${fakePrescriptionId}`)
				.set("Authorization", `Bearer ${adminAccessToken}`);

			expect(response.status).toBe(404);
		});
	});

	describe("Cross-tenant isolation", () => {
		it("should deny access to prescription from different tenant", async () => {
			const differentTenantContext = await createAuthTestContext({
				roleName: "HOSPITAL_ADMIN",
				rolePermissions: ["PRESCRIPTION:READ"],
				createStaff: true,
			});
			const tokens = await differentTenantContext.issuePasswordTokens();

			const response = await request(app)
				.get(`/api/prescriptions/${prescriptionId}`)
				.set("Authorization", `Bearer ${tokens.accessToken}`);

			// Should be 404 because prescription doesn't exist in their tenant
			expect(response.status).toBe(404);

			await differentTenantContext.cleanup();
		});
	});

	describe("Prescription data integrity", () => {
		it("should return prescription with correct data", async () => {
			const response = await request(app)
				.get(`/api/prescriptions/${prescriptionId}`)
				.set("Authorization", `Bearer ${adminAccessToken}`);

			expect(response.status).toBe(200);
			expect(response.body.diagnosis).toBe("Test Diagnosis 1");
			expect(response.body.medicines).toHaveLength(1);
			expect(response.body.medicines[0].name).toBe("Medication A");
			expect(response.body.status).toBe("PENDING");
		});
	});
});

import { Dispensing, Patient, Prescription, Staff } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/dispensing/history - Filters", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId1: string;
	let patientId2: string;
	let prescriptionId1: string;
	let prescriptionId2: string;
	let dispensingId1: string;
	let dispensingId2: string;
	let anotherPharmacistId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["DISPENSING:READ", "DISPENSING:CREATE"],
			includeDepartment: true,
			pricingTier: "PROFESSIONAL",
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create another pharmacist for filter testing
		anotherPharmacistId = uuidv4();
		await Staff.create({
			_id: anotherPharmacistId,
			tenantId: context.hospitalId,
			userId: uuidv4(),
			employeeId: `EMP-${context.uniqueId}-2`,
			firstName: "Another",
			lastName: "Pharmacist",
			phone: "+1-555-9999",
			roles: context.roleIds,
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create test patients
		patientId1 = uuidv4();
		patientId2 = uuidv4();

		for (const [id, suffix] of [
			[patientId1, "1"],
			[patientId2, "2"],
		]) {
			await Patient.create({
				_id: id,
				tenantId: context.hospitalId,
				patientId: `${context.hospitalId}-P-${context.uniqueId}-${suffix}`,
				firstName: `Patient${suffix}`,
				lastName: "Test",
				dateOfBirth: new Date("1990-01-01"),
				gender: "MALE",
				phone: `+1-${context.uniqueId}-${suffix}`,
				email: `patient${suffix}-${context.uniqueId}@test.com`,
				emergencyContact: {
					name: "Emergency Contact",
					relationship: "Spouse",
					phone: "+1-555-1234",
				},
				patientType: "OPD",
				status: "ACTIVE",
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}

		// Create prescriptions
		prescriptionId1 = uuidv4();
		prescriptionId2 = uuidv4();
		const medicineId1 = uuidv4();
		const medicineId2 = uuidv4();

		await Prescription.create({
			_id: prescriptionId1,
			tenantId: context.hospitalId,
			prescriptionId: `${context.hospitalId}-RX-${context.uniqueId}-1`,
			patientId: patientId1,
			doctorId: context.staffId,
			diagnosis: "Test diagnosis 1",
			medicines: [
				{
					_id: medicineId1,
					name: "Paracetamol",
					dosage: "500mg",
					frequency: "3 times daily",
					duration: "5 days",
					quantity: 15,
					dispensed: true,
				},
			],
			status: "DISPENSED",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await Prescription.create({
			_id: prescriptionId2,
			tenantId: context.hospitalId,
			prescriptionId: `${context.hospitalId}-RX-${context.uniqueId}-2`,
			patientId: patientId2,
			doctorId: context.staffId,
			diagnosis: "Test diagnosis 2",
			medicines: [
				{
					_id: medicineId2,
					name: "Ibuprofen",
					dosage: "400mg",
					frequency: "2 times daily",
					duration: "3 days",
					quantity: 6,
					dispensed: true,
				},
			],
			status: "DISPENSED",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create dispensing records with different pharmacists
		dispensingId1 = `${context.hospitalId}-DX-${context.uniqueId}-1`;
		dispensingId2 = `${context.hospitalId}-DX-${context.uniqueId}-2`;

		await Dispensing.create({
			_id: dispensingId1,
			tenantId: context.hospitalId,
			prescriptionId: prescriptionId1,
			status: "DISPENSED",
			assignedTo: context.staffId,
			startedAt: new Date(Date.now() - 7200000),
			completedAt: new Date(Date.now() - 3600000),
			medicines: [
				{ medicineId: medicineId1, dispensedQuantity: 15, status: "DISPENSED" },
			],
			createdAt: new Date(Date.now() - 7200000),
			updatedAt: new Date(),
		});

		await Dispensing.create({
			_id: dispensingId2,
			tenantId: context.hospitalId,
			prescriptionId: prescriptionId2,
			status: "DISPENSED",
			assignedTo: anotherPharmacistId,
			startedAt: new Date(Date.now() - 3600000),
			completedAt: new Date(),
			medicines: [
				{ medicineId: medicineId2, dispensedQuantity: 6, status: "DISPENSED" },
			],
			createdAt: new Date(Date.now() - 3600000),
			updatedAt: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await Dispensing.deleteMany({ tenantId: context.hospitalId });
		await Prescription.deleteMany({ tenantId: context.hospitalId });
		await Patient.deleteMany({ tenantId: context.hospitalId });
		await Staff.deleteOne({ _id: anotherPharmacistId });
		await context.cleanup();
	});

	it("filters by pharmacistId", async () => {
		const response = await request(app)
			.get("/api/dispensing/history")
			.query({ pharmacistId: context.staffId })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.length).toBeGreaterThanOrEqual(1);
		for (const record of response.body.data) {
			expect(record.pharmacist.id).toBe(context.staffId);
		}
	});

	it("filters by patientId", async () => {
		const response = await request(app)
			.get("/api/dispensing/history")
			.query({ patientId: patientId1 })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.length).toBeGreaterThanOrEqual(1);
		for (const record of response.body.data) {
			expect(record.patient.id).toBe(patientId1);
		}
	});

	it("filters by status", async () => {
		const response = await request(app)
			.get("/api/dispensing/history")
			.query({ status: "DISPENSED" })
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		for (const record of response.body.data) {
			expect(record.status).toBe("DISPENSED");
		}
	});
});

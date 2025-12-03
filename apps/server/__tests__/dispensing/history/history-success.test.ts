import { Dispensing, Patient, Prescription } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/dispensing/history - List dispensing history success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	let prescriptionId: string;
	let dispensingId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["DISPENSING:READ", "DISPENSING:CREATE"],
			includeDepartment: true,
			pricingTier: "PROFESSIONAL",
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create a test patient
		patientId = uuidv4();
		await Patient.create({
			_id: patientId,
			tenantId: context.hospitalId,
			patientId: `${context.hospitalId}-P-${context.uniqueId}`,
			firstName: "Test",
			lastName: "Patient",
			dateOfBirth: new Date("1990-01-01"),
			gender: "MALE",
			phone: `+1-${context.uniqueId}`,
			email: `patient-${context.uniqueId}@test.com`,
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

		// Create a prescription
		prescriptionId = uuidv4();
		const medicineId = uuidv4();
		await Prescription.create({
			_id: prescriptionId,
			tenantId: context.hospitalId,
			prescriptionId: `${context.hospitalId}-RX-${context.uniqueId}`,
			patientId,
			doctorId: context.staffId,
			diagnosis: "Test diagnosis",
			medicines: [
				{
					_id: medicineId,
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

		// Create a completed dispensing record
		dispensingId = `${context.hospitalId}-DX-${context.uniqueId}`;
		await Dispensing.create({
			_id: dispensingId,
			tenantId: context.hospitalId,
			prescriptionId,
			status: "DISPENSED",
			assignedTo: context.staffId,
			startedAt: new Date(Date.now() - 3600000),
			completedAt: new Date(),
			medicines: [
				{
					medicineId,
					dispensedQuantity: 15,
					status: "DISPENSED",
				},
			],
			patientCounseled: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await Dispensing.deleteMany({ tenantId: context.hospitalId });
		await Prescription.deleteMany({ tenantId: context.hospitalId });
		await Patient.deleteOne({ _id: patientId });
		await context.cleanup();
	});

	it("returns dispensing history with pharmacist and patient info", async () => {
		const response = await request(app)
			.get("/api/dispensing/history")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("data");
		expect(response.body).toHaveProperty("pagination");
		expect(Array.isArray(response.body.data)).toBe(true);
		expect(response.body.data.length).toBeGreaterThanOrEqual(1);

		// Find our dispensing record
		const record = response.body.data.find(
			(d: { id: string }) => d.id === dispensingId,
		);
		expect(record).toBeDefined();
		expect(record.status).toBe("DISPENSED");
		expect(record).toHaveProperty("pharmacist");
		expect(record).toHaveProperty("patient");
		expect(record).toHaveProperty("completedAt");
	});
});

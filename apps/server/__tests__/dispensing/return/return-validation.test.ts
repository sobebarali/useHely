import { Dispensing, Patient, Prescription } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/dispensing/:prescriptionId/return - Validation errors", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	let prescriptionId: string;
	let medicineId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["DISPENSING:UPDATE"],
			includeDepartment: true,
			pricingTier: "PROFESSIONAL",
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

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

		prescriptionId = uuidv4();
		medicineId = uuidv4();
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
					dispensed: false,
				},
			],
			status: "DISPENSING",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await Dispensing.create({
			_id: `${context.hospitalId}-DX-${context.uniqueId}`,
			tenantId: context.hospitalId,
			prescriptionId,
			status: "DISPENSING",
			assignedTo: context.staffId,
			startedAt: new Date(),
			medicines: [{ medicineId, dispensedQuantity: 0, status: "PENDING" }],
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

	it("returns 400 when reason is missing", async () => {
		const response = await request(app)
			.post(`/api/dispensing/${prescriptionId}/return`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({});

		expect(response.status).toBe(400);
	});

	it("returns 400 when reason is empty string", async () => {
		const response = await request(app)
			.post(`/api/dispensing/${prescriptionId}/return`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ reason: "" });

		expect(response.status).toBe(400);
	});
});

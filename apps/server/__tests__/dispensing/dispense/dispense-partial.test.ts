import { Dispensing, Patient, Prescription } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/dispensing/:prescriptionId/dispense - Partial dispense", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	let prescriptionId: string;
	let medicineId1: string;
	let medicineId2: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["DISPENSING:CREATE", "DISPENSING:READ"],
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
		medicineId1 = uuidv4();
		medicineId2 = uuidv4();
		await Prescription.create({
			_id: prescriptionId,
			tenantId: context.hospitalId,
			prescriptionId: `${context.hospitalId}-RX-${context.uniqueId}`,
			patientId,
			doctorId: context.staffId,
			diagnosis: "Test diagnosis",
			medicines: [
				{
					_id: medicineId1,
					name: "Paracetamol",
					dosage: "500mg",
					frequency: "3 times daily",
					duration: "5 days",
					quantity: 15,
					dispensed: false,
				},
				{
					_id: medicineId2,
					name: "Ibuprofen",
					dosage: "400mg",
					frequency: "2 times daily",
					duration: "3 days",
					quantity: 6,
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
			medicines: [
				{ medicineId: medicineId1, dispensedQuantity: 0, status: "PENDING" },
				{ medicineId: medicineId2, dispensedQuantity: 0, status: "PENDING" },
			],
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

	it("dispenses only some medicines with correct counts", async () => {
		const response = await request(app)
			.post(`/api/dispensing/${prescriptionId}/dispense`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				medicines: [
					{
						medicineId: medicineId1,
						dispensedQuantity: 15,
					},
				],
			});

		expect(response.status).toBe(200);
		expect(response.body.totalDispensed).toBe(1);
		expect(response.body.totalPending).toBe(1);

		// Verify database state
		const dispensing = await Dispensing.findOne({ prescriptionId }).lean();
		const medicines = dispensing?.medicines as
			| Array<{ medicineId: string; status: string }>
			| undefined;
		const med1 = medicines?.find((m) => m.medicineId === medicineId1);
		const med2 = medicines?.find((m) => m.medicineId === medicineId2);
		expect(med1?.status).toBe("DISPENSED");
		expect(med2?.status).toBe("PENDING");
	});
});

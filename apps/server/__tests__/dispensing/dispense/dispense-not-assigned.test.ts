import { Dispensing, Patient, Prescription, Staff } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/dispensing/:prescriptionId/dispense - Not assigned to pharmacist", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	let prescriptionId: string;
	let medicineId: string;
	let anotherPharmacistId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["DISPENSING:CREATE"],
			includeDepartment: true,
			pricingTier: "PROFESSIONAL",
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create another pharmacist
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

		// Create dispensing record assigned to ANOTHER pharmacist
		await Dispensing.create({
			_id: `${context.hospitalId}-DX-${context.uniqueId}`,
			tenantId: context.hospitalId,
			prescriptionId,
			status: "DISPENSING",
			assignedTo: anotherPharmacistId, // Different pharmacist
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
		await Staff.deleteOne({ _id: anotherPharmacistId });
		await context.cleanup();
	});

	it("returns 403 when prescription is assigned to different pharmacist", async () => {
		const response = await request(app)
			.post(`/api/dispensing/${prescriptionId}/dispense`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				medicines: [
					{
						medicineId,
						dispensedQuantity: 15,
					},
				],
			});

		expect(response.status).toBe(403);
	});
});

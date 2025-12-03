import { Dispensing, Patient, Prescription } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/dispensing/:prescriptionId/start - Start dispensing success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	let prescriptionId: string;
	let medicineId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["DISPENSING:CREATE", "DISPENSING:READ"],
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

		// Create a pending prescription
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
				{
					_id: uuidv4(),
					name: "Ibuprofen",
					dosage: "400mg",
					frequency: "2 times daily",
					duration: "3 days",
					quantity: 6,
					dispensed: false,
				},
			],
			status: "PENDING",
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

	it("starts dispensing and creates dispensing record", async () => {
		const response = await request(app)
			.post(`/api/dispensing/${prescriptionId}/start`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("id");
		expect(response.body).toHaveProperty("prescriptionId", prescriptionId);
		expect(response.body).toHaveProperty("status", "DISPENSING");
		expect(response.body).toHaveProperty("assignedTo");
		expect(response.body.assignedTo.id).toBe(context.staffId);
		expect(response.body).toHaveProperty("startedAt");
		expect(response.body).toHaveProperty("medicines");
		expect(response.body.medicines.length).toBe(2);

		// Verify each medicine has stock info
		for (const medicine of response.body.medicines) {
			expect(medicine).toHaveProperty("id");
			expect(medicine).toHaveProperty("name");
			expect(medicine).toHaveProperty("dosage");
			expect(medicine).toHaveProperty("prescribedQuantity");
			expect(medicine).toHaveProperty("status", "PENDING");
		}

		// Verify dispensing record was created in DB
		const dispensing = await Dispensing.findOne({ prescriptionId });
		expect(dispensing).not.toBeNull();
		expect(dispensing?.status).toBe("DISPENSING");
		expect(dispensing?.assignedTo).toBe(context.staffId);

		// Verify prescription status was updated
		const prescription = await Prescription.findById(prescriptionId);
		expect(prescription?.status).toBe("DISPENSING");
	});
});

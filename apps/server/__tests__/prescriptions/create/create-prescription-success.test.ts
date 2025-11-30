import { Patient, Prescription } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/prescriptions - Create prescription success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	let createdPrescriptionId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["PRESCRIPTION:CREATE", "PRESCRIPTION:READ"],
			includeDepartment: true,
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
	}, 30000);

	afterAll(async () => {
		if (createdPrescriptionId) {
			await Prescription.deleteOne({ _id: createdPrescriptionId });
		}
		await Patient.deleteOne({ _id: patientId });
		await context.cleanup();
	});

	it("creates a prescription successfully", async () => {
		const payload = {
			patientId,
			diagnosis: "Common cold with mild fever",
			notes: "Patient should rest and stay hydrated",
			medicines: [
				{
					name: "Paracetamol",
					dosage: "500mg",
					frequency: "3 times daily",
					duration: "5 days",
					instructions: "Take after meals",
					route: "Oral",
					quantity: 15,
				},
				{
					name: "Vitamin C",
					dosage: "1000mg",
					frequency: "Once daily",
					duration: "7 days",
					instructions: "Take in the morning",
				},
			],
			followUpDate: new Date(
				Date.now() + 7 * 24 * 60 * 60 * 1000,
			).toISOString(),
		};

		const response = await request(app)
			.post("/api/prescriptions")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("id");
		expect(response.body).toHaveProperty("prescriptionId");
		expect(response.body.diagnosis).toBe(payload.diagnosis);
		expect(response.body.notes).toBe(payload.notes);
		expect(response.body.status).toBe("PENDING");
		expect(response.body.medicines).toHaveLength(2);
		expect(response.body.medicines[0].name).toBe("Paracetamol");
		expect(response.body.medicines[0].dispensed).toBe(false);
		expect(response.body.medicines[1].name).toBe("Vitamin C");
		expect(response.body.patient.id).toBe(patientId);
		expect(response.body.patient.firstName).toBe("Test");
		expect(response.body.doctor.id).toBe(context.staffId);
		expect(response.body.prescriptionId).toMatch(
			new RegExp(`^${context.hospitalId}-RX-\\d+$`),
		);

		createdPrescriptionId = response.body.id;
	});
});

import { Patient, Prescription } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/prescriptions/:id - Get prescription by ID success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	let prescriptionId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["PRESCRIPTION:READ"],
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
			firstName: "John",
			lastName: "Doe",
			dateOfBirth: new Date("1985-05-15"),
			gender: "MALE",
			phone: `+1-${context.uniqueId}`,
			email: `patient-${context.uniqueId}@test.com`,
			emergencyContact: {
				name: "Jane Doe",
				relationship: "Spouse",
				phone: "+1-555-1234",
			},
			patientType: "OPD",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create a test prescription
		prescriptionId = uuidv4();
		const followUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
		await Prescription.create({
			_id: prescriptionId,
			tenantId: context.hospitalId,
			prescriptionId: `${context.hospitalId}-RX-${context.uniqueId}`,
			patientId,
			doctorId: context.staffId,
			diagnosis: "Acute bronchitis with mild fever",
			notes: "Patient should avoid cold drinks and rest well",
			medicines: [
				{
					// Let Mongoose auto-generate _id
					name: "Amoxicillin",
					dosage: "500mg",
					frequency: "3 times daily",
					duration: "7 days",
					instructions: "Take after meals",
					route: "Oral",
					quantity: 21,
					dispensed: false,
					dispensedQuantity: 0,
				},
				{
					// Let Mongoose auto-generate _id
					name: "Cough Syrup",
					dosage: "10ml",
					frequency: "Twice daily",
					duration: "5 days",
					instructions: "Take at night",
					route: "Oral",
					dispensed: true,
					dispensedQuantity: 100,
				},
			],
			status: "DISPENSING",
			followUpDate,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await Prescription.deleteOne({ _id: prescriptionId });
		await Patient.deleteOne({ _id: patientId });
		await context.cleanup();
	});

	it("retrieves a prescription by ID successfully", async () => {
		const response = await request(app)
			.get(`/api/prescriptions/${prescriptionId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.id).toBe(prescriptionId);
		expect(response.body.prescriptionId).toContain(`${context.hospitalId}-RX-`);
		expect(response.body.diagnosis).toBe("Acute bronchitis with mild fever");
		expect(response.body.notes).toBe(
			"Patient should avoid cold drinks and rest well",
		);
		expect(response.body.status).toBe("DISPENSING");

		// Verify patient details
		expect(response.body.patient).toEqual(
			expect.objectContaining({
				id: patientId,
				firstName: "John",
				lastName: "Doe",
				gender: "MALE",
			}),
		);

		// Verify doctor details
		expect(response.body.doctor).toEqual(
			expect.objectContaining({
				id: context.staffId,
			}),
		);

		// Verify medicines
		expect(response.body.medicines).toHaveLength(2);
		expect(response.body.medicines[0]).toEqual(
			expect.objectContaining({
				name: "Amoxicillin",
				dosage: "500mg",
				frequency: "3 times daily",
				duration: "7 days",
				instructions: "Take after meals",
				route: "Oral",
				quantity: 21,
				dispensed: false,
				dispensedQuantity: 0,
			}),
		);
		expect(response.body.medicines[1]).toEqual(
			expect.objectContaining({
				name: "Cough Syrup",
				dispensed: true,
				dispensedQuantity: 100,
			}),
		);

		// Verify timestamps
		expect(response.body).toHaveProperty("followUpDate");
		expect(response.body).toHaveProperty("createdAt");
		expect(response.body).toHaveProperty("updatedAt");
	});

	it("returns 404 for non-existent prescription", async () => {
		const nonExistentId = uuidv4();
		const response = await request(app)
			.get(`/api/prescriptions/${nonExistentId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body.code).toBe("PRESCRIPTION_NOT_FOUND");
	});

	it("returns 401 without authentication", async () => {
		const response = await request(app).get(
			`/api/prescriptions/${prescriptionId}`,
		);

		expect(response.status).toBe(401);
	});
});

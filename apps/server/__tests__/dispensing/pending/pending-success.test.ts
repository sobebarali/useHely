import { Dispensing, Patient, Prescription } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/dispensing/pending - List pending prescriptions success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	const prescriptionIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["DISPENSING:READ"],
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

		// Create pending prescriptions
		for (let i = 0; i < 3; i++) {
			const prescriptionId = uuidv4();
			prescriptionIds.push(prescriptionId);

			await Prescription.create({
				_id: prescriptionId,
				tenantId: context.hospitalId,
				prescriptionId: `${context.hospitalId}-RX-${context.uniqueId}-${i}`,
				patientId,
				doctorId: context.staffId,
				diagnosis: `Test diagnosis ${i}`,
				notes: `Test notes ${i}`,
				medicines: [
					{
						_id: uuidv4(),
						name: "Paracetamol",
						dosage: "500mg",
						frequency: "3 times daily",
						duration: "5 days",
						instructions: "Take after meals",
						quantity: 15,
						dispensed: false,
					},
				],
				status: "PENDING",
				createdAt: new Date(Date.now() - i * 60000), // Stagger creation times
				updatedAt: new Date(),
			});
		}
	}, 30000);

	afterAll(async () => {
		await Dispensing.deleteMany({ tenantId: context.hospitalId });
		await Prescription.deleteMany({ tenantId: context.hospitalId });
		await Patient.deleteOne({ _id: patientId });
		await context.cleanup();
	});

	it("returns pending prescriptions with patient and doctor info", async () => {
		const response = await request(app)
			.get("/api/dispensing/pending")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("data");
		expect(response.body).toHaveProperty("pagination");
		expect(response.body).toHaveProperty("summary");
		expect(Array.isArray(response.body.data)).toBe(true);
		expect(response.body.data.length).toBeGreaterThanOrEqual(3);

		// Verify structure of first prescription
		const prescription = response.body.data[0];
		expect(prescription).toHaveProperty("id");
		expect(prescription).toHaveProperty("prescriptionId");
		expect(prescription).toHaveProperty("patient");
		expect(prescription).toHaveProperty("doctor");
		expect(prescription).toHaveProperty("medicines");
		expect(prescription.patient).toHaveProperty("firstName");
		expect(prescription.doctor).toHaveProperty("firstName");

		// Verify pagination
		expect(response.body.pagination).toHaveProperty("page");
		expect(response.body.pagination).toHaveProperty("limit");
		expect(response.body.pagination).toHaveProperty("total");

		// Verify summary
		expect(response.body.summary).toHaveProperty("totalPending");
		expect(response.body.summary.totalPending).toBeGreaterThanOrEqual(3);
	});
});

import { Patient, Prescription } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/prescriptions - List prescriptions success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	const prescriptionIds: string[] = [];

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

		// Create test prescriptions
		for (let i = 0; i < 3; i++) {
			const prescriptionId = uuidv4();
			prescriptionIds.push(prescriptionId);
			await Prescription.create({
				_id: prescriptionId,
				tenantId: context.hospitalId,
				prescriptionId: `${context.hospitalId}-RX-${context.uniqueId}-${i}`,
				patientId,
				doctorId: context.staffId,
				diagnosis: `Test diagnosis ${i + 1}`,
				notes: `Test notes ${i + 1}`,
				medicines: [
					{
						// Let Mongoose auto-generate _id
						name: `Medicine ${i + 1}`,
						dosage: "500mg",
						frequency: "Daily",
						duration: "7 days",
						instructions: "Take with food",
						dispensed: false,
					},
				],
				status: i === 0 ? "PENDING" : i === 1 ? "DISPENSED" : "COMPLETED",
				createdAt: new Date(Date.now() - i * 86400000), // Different dates
				updatedAt: new Date(),
			});
		}
	}, 30000);

	afterAll(async () => {
		for (const id of prescriptionIds) {
			await Prescription.deleteOne({ _id: id });
		}
		await Patient.deleteOne({ _id: patientId });
		await context.cleanup();
	});

	it("lists all prescriptions for the tenant", async () => {
		const response = await request(app)
			.get("/api/prescriptions")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("data");
		expect(response.body).toHaveProperty("pagination");
		expect(response.body.data.length).toBeGreaterThanOrEqual(3);
		expect(response.body.pagination).toHaveProperty("page", 1);
		expect(response.body.pagination).toHaveProperty("limit", 20);
		expect(response.body.pagination).toHaveProperty("total");
		expect(response.body.pagination).toHaveProperty("totalPages");

		// Verify prescription structure
		const prescription = response.body.data[0];
		expect(prescription).toHaveProperty("id");
		expect(prescription).toHaveProperty("prescriptionId");
		expect(prescription).toHaveProperty("patient");
		expect(prescription).toHaveProperty("doctor");
		expect(prescription).toHaveProperty("diagnosis");
		expect(prescription).toHaveProperty("medicineCount");
		expect(prescription).toHaveProperty("status");
		expect(prescription).toHaveProperty("createdAt");
	});

	it("filters prescriptions by patient ID", async () => {
		const response = await request(app)
			.get(`/api/prescriptions?patientId=${patientId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.length).toBe(3);
		for (const prescription of response.body.data) {
			expect(prescription.patient.id).toBe(patientId);
		}
	});

	it("filters prescriptions by status", async () => {
		const response = await request(app)
			.get("/api/prescriptions?status=PENDING")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		for (const prescription of response.body.data) {
			expect(prescription.status).toBe("PENDING");
		}
	});

	it("paginates results correctly", async () => {
		const response = await request(app)
			.get("/api/prescriptions?page=1&limit=2")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.length).toBeLessThanOrEqual(2);
		expect(response.body.pagination.page).toBe(1);
		expect(response.body.pagination.limit).toBe(2);
	});

	it("sorts prescriptions by createdAt descending by default", async () => {
		const response = await request(app)
			.get(`/api/prescriptions?patientId=${patientId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		const dates = response.body.data.map((p: { createdAt: string }) =>
			new Date(p.createdAt).getTime(),
		);
		for (let i = 1; i < dates.length; i++) {
			expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
		}
	});
});

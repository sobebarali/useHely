import { Patient, Prescription } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PATCH /api/prescriptions/:id - Update prescription success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	let prescriptionId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: [
				"PRESCRIPTION:CREATE",
				"PRESCRIPTION:UPDATE",
				"PRESCRIPTION:READ",
			],
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
			firstName: "Update",
			lastName: "Patient",
			dateOfBirth: new Date("1990-01-01"),
			gender: "MALE",
			phone: `+1-update-${context.uniqueId}`,
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

		// Create a prescription to update
		prescriptionId = uuidv4();
		await Prescription.create({
			_id: prescriptionId,
			tenantId: context.hospitalId,
			prescriptionId: `${context.hospitalId}-RX-${context.uniqueId}`,
			patientId,
			doctorId: context.staffId,
			diagnosis: "Original diagnosis",
			notes: "Original notes",
			medicines: [
				{
					// Let Mongoose auto-generate _id
					name: "Original Medicine",
					dosage: "100mg",
					frequency: "Once daily",
					duration: "5 days",
					dispensed: false,
					dispensedQuantity: 0,
				},
			],
			status: "PENDING",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await Prescription.deleteOne({ _id: prescriptionId });
		await Patient.deleteOne({ _id: patientId });
		await context.cleanup();
	});

	it("updates prescription diagnosis successfully", async () => {
		const payload = {
			diagnosis: "Updated diagnosis with new findings",
		};

		const response = await request(app)
			.patch(`/api/prescriptions/${prescriptionId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(200);
		expect(response.body.diagnosis).toBe(payload.diagnosis);
		expect(response.body.id).toBe(prescriptionId);
	});

	it("updates prescription notes successfully", async () => {
		const payload = {
			notes: "Updated notes with additional instructions",
		};

		const response = await request(app)
			.patch(`/api/prescriptions/${prescriptionId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(200);
		expect(response.body.notes).toBe(payload.notes);
	});

	it("updates prescription medicines successfully", async () => {
		const payload = {
			medicines: [
				{
					name: "Updated Medicine",
					dosage: "200mg",
					frequency: "Twice daily",
					duration: "7 days",
					instructions: "Take with food",
				},
				{
					name: "New Medicine",
					dosage: "50mg",
					frequency: "Once daily",
					duration: "3 days",
				},
			],
		};

		const response = await request(app)
			.patch(`/api/prescriptions/${prescriptionId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(200);
		expect(response.body.medicines).toHaveLength(2);
		expect(response.body.medicines[0].name).toBe("Updated Medicine");
		expect(response.body.medicines[0].dosage).toBe("200mg");
		expect(response.body.medicines[1].name).toBe("New Medicine");
	});
});

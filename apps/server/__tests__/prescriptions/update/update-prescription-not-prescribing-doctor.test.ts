import { Patient, Prescription } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PATCH /api/prescriptions/:id - Not prescribing doctor", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	let prescriptionId: string;
	let otherDoctorId: string;

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

		// Create another doctor (different from the authenticated user)
		otherDoctorId = uuidv4();

		// Create a test patient
		patientId = uuidv4();
		await Patient.create({
			_id: patientId,
			tenantId: context.hospitalId,
			patientId: `${context.hospitalId}-P-other-${context.uniqueId}`,
			firstName: "Other",
			lastName: "Patient",
			dateOfBirth: new Date("1990-01-01"),
			gender: "FEMALE",
			phone: `+1-other-${context.uniqueId}`,
			emergencyContact: {
				name: "Emergency Contact",
				relationship: "Parent",
				phone: "+1-555-9999",
			},
			patientType: "OPD",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create a prescription by a different doctor
		prescriptionId = uuidv4();
		await Prescription.create({
			_id: prescriptionId,
			tenantId: context.hospitalId,
			prescriptionId: `${context.hospitalId}-RX-other-${context.uniqueId}`,
			patientId,
			doctorId: otherDoctorId, // Different doctor
			diagnosis: "Diagnosis by other doctor",
			medicines: [
				{
					// Let Mongoose auto-generate _id
					name: "Medicine",
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

	it("returns 403 when trying to update prescription by different doctor", async () => {
		const payload = {
			diagnosis: "Trying to update another doctor's prescription",
		};

		const response = await request(app)
			.patch(`/api/prescriptions/${prescriptionId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("NOT_PRESCRIBING_DOCTOR");
		expect(response.body.message).toBe(
			"Only the prescribing doctor can modify this prescription",
		);
	});
});

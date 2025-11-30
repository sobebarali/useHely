import { Patient, Prescription } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PATCH /api/prescriptions/:id - Prescription not modifiable", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	let dispensedPrescriptionId: string;
	let completedPrescriptionId: string;
	let cancelledPrescriptionId: string;

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
			patientId: `${context.hospitalId}-P-status-${context.uniqueId}`,
			firstName: "Status",
			lastName: "Patient",
			dateOfBirth: new Date("1990-01-01"),
			gender: "MALE",
			phone: `+1-status-${context.uniqueId}`,
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

		// Create a dispensed prescription
		dispensedPrescriptionId = uuidv4();
		await Prescription.create({
			_id: dispensedPrescriptionId,
			tenantId: context.hospitalId,
			prescriptionId: `${context.hospitalId}-RX-dispensed-${context.uniqueId}`,
			patientId,
			doctorId: context.staffId,
			diagnosis: "Dispensed prescription",
			medicines: [
				{
					// Let Mongoose auto-generate _id
					name: "Medicine",
					dosage: "100mg",
					frequency: "Once daily",
					duration: "5 days",
					dispensed: true,
					dispensedQuantity: 5,
				},
			],
			status: "DISPENSED",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create a completed prescription
		completedPrescriptionId = uuidv4();
		await Prescription.create({
			_id: completedPrescriptionId,
			tenantId: context.hospitalId,
			prescriptionId: `${context.hospitalId}-RX-completed-${context.uniqueId}`,
			patientId,
			doctorId: context.staffId,
			diagnosis: "Completed prescription",
			medicines: [
				{
					// Let Mongoose auto-generate _id
					name: "Medicine",
					dosage: "100mg",
					frequency: "Once daily",
					duration: "5 days",
					dispensed: true,
					dispensedQuantity: 5,
				},
			],
			status: "COMPLETED",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create a cancelled prescription
		cancelledPrescriptionId = uuidv4();
		await Prescription.create({
			_id: cancelledPrescriptionId,
			tenantId: context.hospitalId,
			prescriptionId: `${context.hospitalId}-RX-cancelled-${context.uniqueId}`,
			patientId,
			doctorId: context.staffId,
			diagnosis: "Cancelled prescription",
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
			status: "CANCELLED",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await Prescription.deleteMany({
			_id: {
				$in: [
					dispensedPrescriptionId,
					completedPrescriptionId,
					cancelledPrescriptionId,
				],
			},
		});
		await Patient.deleteOne({ _id: patientId });
		await context.cleanup();
	});

	it("returns 400 when trying to update a dispensed prescription", async () => {
		const payload = {
			diagnosis: "Trying to update dispensed prescription",
		};

		const response = await request(app)
			.patch(`/api/prescriptions/${dispensedPrescriptionId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("PRESCRIPTION_NOT_MODIFIABLE");
		expect(response.body.message).toContain("DISPENSED");
	});

	it("returns 400 when trying to update a completed prescription", async () => {
		const payload = {
			diagnosis: "Trying to update completed prescription",
		};

		const response = await request(app)
			.patch(`/api/prescriptions/${completedPrescriptionId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("PRESCRIPTION_NOT_MODIFIABLE");
		expect(response.body.message).toContain("COMPLETED");
	});

	it("returns 400 when trying to update a cancelled prescription", async () => {
		const payload = {
			diagnosis: "Trying to update cancelled prescription",
		};

		const response = await request(app)
			.patch(`/api/prescriptions/${cancelledPrescriptionId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("PRESCRIPTION_NOT_MODIFIABLE");
		expect(response.body.message).toContain("CANCELLED");
	});
});

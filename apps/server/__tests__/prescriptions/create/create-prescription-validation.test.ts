import { Patient } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/prescriptions - Validation errors", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["PRESCRIPTION:CREATE"],
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
			phone: `+1-validation-${context.uniqueId}`,
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
		await Patient.deleteOne({ _id: patientId });
		await context.cleanup();
	});

	it("returns 400 when patientId is missing", async () => {
		const payload = {
			diagnosis: "Test diagnosis",
			medicines: [
				{
					name: "Test Medicine",
					dosage: "100mg",
					frequency: "Once daily",
					duration: "5 days",
				},
			],
		};

		const response = await request(app)
			.post("/api/prescriptions")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
	});

	it("returns 400 when diagnosis is missing", async () => {
		const payload = {
			patientId,
			medicines: [
				{
					name: "Test Medicine",
					dosage: "100mg",
					frequency: "Once daily",
					duration: "5 days",
				},
			],
		};

		const response = await request(app)
			.post("/api/prescriptions")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
	});

	it("returns 400 when medicines array is empty", async () => {
		const payload = {
			patientId,
			diagnosis: "Test diagnosis",
			medicines: [],
		};

		const response = await request(app)
			.post("/api/prescriptions")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
	});

	it("returns 400 when medicine is missing required fields", async () => {
		const payload = {
			patientId,
			diagnosis: "Test diagnosis",
			medicines: [
				{
					name: "Test Medicine",
					// Missing dosage, frequency, duration
				},
			],
		};

		const response = await request(app)
			.post("/api/prescriptions")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
	});
});

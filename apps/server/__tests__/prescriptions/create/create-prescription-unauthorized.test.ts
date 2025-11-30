import { Patient } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/prescriptions - Unauthorized", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;

	beforeAll(async () => {
		// Create context without PRESCRIPTION:CREATE permission
		context = await createAuthTestContext({
			rolePermissions: ["PATIENT:READ"],
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

	it("returns 403 when user lacks PRESCRIPTION:CREATE permission", async () => {
		const payload = {
			patientId,
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

		expect(response.status).toBe(403);
	});

	it("returns 401 when no authorization header is provided", async () => {
		const payload = {
			patientId,
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
			.send(payload);

		expect(response.status).toBe(401);
	});
});

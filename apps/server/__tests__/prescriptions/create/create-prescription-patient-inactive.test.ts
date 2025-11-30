import { Patient } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/prescriptions - Patient inactive", () => {
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

		// Create an inactive patient
		patientId = uuidv4();
		await Patient.create({
			_id: patientId,
			tenantId: context.hospitalId,
			patientId: `${context.hospitalId}-P-${context.uniqueId}`,
			firstName: "Inactive",
			lastName: "Patient",
			dateOfBirth: new Date("1990-01-01"),
			gender: "FEMALE",
			phone: `+1-inactive-${context.uniqueId}`,
			emergencyContact: {
				name: "Emergency Contact",
				relationship: "Parent",
				phone: "+1-555-9999",
			},
			patientType: "OPD",
			status: "INACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await Patient.deleteOne({ _id: patientId });
		await context.cleanup();
	});

	it("returns 400 when patient is inactive", async () => {
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

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("PATIENT_INACTIVE");
		expect(response.body.message).toBe(
			"Cannot create prescription for inactive patient",
		);
	});
});

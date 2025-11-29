import { Patient } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PATCH /api/patients/:id - Validation errors", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let createdPatientId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["PATIENT:CREATE", "PATIENT:READ", "PATIENT:UPDATE"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create a test patient
		const payload = {
			firstName: "UpdateValidation",
			lastName: "Patient",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "MALE",
			phone: `+1-upd-val-${context.uniqueId}`,
			address: {
				street: "123 Main St",
				city: "Test City",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			emergencyContact: {
				name: "Emergency Contact",
				relationship: "Family",
				phone: "+1-555-0000",
			},
			patientType: "OPD",
		};

		const response = await request(app)
			.post("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		createdPatientId = response.body.id;
	}, 30000);

	afterAll(async () => {
		if (createdPatientId) {
			await Patient.deleteOne({ _id: createdPatientId });
		}
		await context.cleanup();
	});

	it("returns 400 when email has invalid format", async () => {
		const response = await request(app)
			.patch(`/api/patients/${createdPatientId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ email: "not-an-email" });

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});

	it("returns 400 when patientType is invalid", async () => {
		const response = await request(app)
			.patch(`/api/patients/${createdPatientId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ patientType: "INVALID_TYPE" });

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});

	it("returns 400 when department does not exist", async () => {
		const response = await request(app)
			.patch(`/api/patients/${createdPatientId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ department: "non-existent-department-id" });

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_DEPARTMENT");
	});
});

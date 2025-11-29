import { Patient } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PATCH /api/patients/:id - Update patient success", () => {
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
			firstName: "UpdateTest",
			lastName: "Patient",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "MALE",
			phone: `+1-update-${context.uniqueId}`,
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

	it("updates patient phone successfully", async () => {
		const newPhone = `+1-updated-${context.uniqueId}`;

		const response = await request(app)
			.patch(`/api/patients/${createdPatientId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ phone: newPhone });

		expect(response.status).toBe(200);
		expect(response.body.phone).toBe(newPhone);
	});

	it("updates patient email successfully", async () => {
		const newEmail = `updated-${context.uniqueId}@test.com`;

		const response = await request(app)
			.patch(`/api/patients/${createdPatientId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ email: newEmail });

		expect(response.status).toBe(200);
		expect(response.body.email).toBe(newEmail);
	});

	it("updates patient type from OPD to IPD", async () => {
		const response = await request(app)
			.patch(`/api/patients/${createdPatientId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ patientType: "IPD" });

		expect(response.status).toBe(200);
		expect(response.body.patientType).toBe("IPD");
	});

	it("returns 404 for non-existent patient", async () => {
		const response = await request(app)
			.patch("/api/patients/non-existent-id")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ phone: "+1-555-1234" });

		expect(response.status).toBe(404);
		expect(response.body.code).toBe("NOT_FOUND");
	});
});

import { Patient } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/appointments - Returns 404 for invalid doctor", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "RECEPTIONIST",
			rolePermissions: ["APPOINTMENT:CREATE"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		const patient = await Patient.create({
			_id: uuidv4(),
			tenantId: context.hospitalId,
			patientId: `${context.hospitalId}-P-${Date.now()}`,
			firstName: "Test",
			lastName: "Patient",
			dateOfBirth: new Date("1990-01-15"),
			gender: "MALE",
			phone: `+1-${context.uniqueId}`,
			patientType: "OPD",
			status: "ACTIVE",
			emergencyContact: {
				name: "Emergency Contact",
				relationship: "Spouse",
				phone: "+1-555-0000",
			},
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		patientId = String(patient._id);
	}, 30000);

	afterAll(async () => {
		if (patientId) {
			await Patient.deleteOne({ _id: patientId });
		}
		await context.cleanup();
	});

	it("returns 404 when doctor does not exist", async () => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);

		const payload = {
			patientId,
			doctorId: uuidv4(),
			departmentId: context.departmentId,
			date: tomorrow.toISOString(),
			timeSlot: {
				start: "10:00",
				end: "10:30",
			},
			type: "CONSULTATION",
		};

		const response = await request(app)
			.post("/api/appointments")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(404);
		expect(response.body.code).toBe("INVALID_DOCTOR");
	});
});

import { Appointment, Patient } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/appointments/:id/complete - Returns 400 for not checked in appointment", () => {
	let doctorContext: AuthTestContext;
	let doctorAccessToken: string;
	let patientId: string;
	let appointmentId: string;

	beforeAll(async () => {
		doctorContext = await createAuthTestContext({
			roleName: "DOCTOR",
			rolePermissions: ["APPOINTMENT:UPDATE", "APPOINTMENT:READ"],
			includeDepartment: true,
		});
		const tokens = await doctorContext.issuePasswordTokens();
		doctorAccessToken = tokens.accessToken;

		// Create a patient
		const patient = await Patient.create({
			_id: uuidv4(),
			tenantId: doctorContext.hospitalId,
			patientId: `${doctorContext.hospitalId}-P-${Date.now()}`,
			firstName: "Test",
			lastName: "Patient",
			dateOfBirth: new Date("1990-01-15"),
			gender: "MALE",
			phone: `+1-${doctorContext.uniqueId}`,
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

		const today = new Date();
		today.setHours(11, 0, 0, 0);

		// Create a scheduled (not checked-in) appointment
		const appointment = await Appointment.create({
			_id: uuidv4(),
			tenantId: doctorContext.hospitalId,
			appointmentNumber: `${doctorContext.hospitalId}-APT-${Date.now()}`,
			patientId,
			doctorId: doctorContext.staffId,
			departmentId: doctorContext.departmentId,
			date: today,
			timeSlot: { start: "11:00", end: "11:30" },
			type: "CONSULTATION",
			priority: "NORMAL",
			status: "SCHEDULED", // Not checked in
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		appointmentId = String(appointment._id);
	}, 30000);

	afterAll(async () => {
		if (appointmentId) {
			await Appointment.deleteOne({ _id: appointmentId });
		}
		if (patientId) {
			await Patient.deleteOne({ _id: patientId });
		}
		await doctorContext.cleanup();
	});

	it("returns 400 when appointment is not checked in", async () => {
		const response = await request(app)
			.post(`/api/appointments/${appointmentId}/complete`)
			.set("Authorization", `Bearer ${doctorAccessToken}`);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("NOT_CHECKED_IN");
	});
});

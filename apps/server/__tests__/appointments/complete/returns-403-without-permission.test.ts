import { Appointment, Patient } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/appointments/:id/complete - Returns 403 without permission", () => {
	let doctorContext: AuthTestContext;
	let unauthorizedContext: AuthTestContext;
	let unauthorizedToken: string;
	let patientId: string;
	let appointmentId: string;

	beforeAll(async () => {
		doctorContext = await createAuthTestContext({
			roleName: "DOCTOR",
			rolePermissions: ["APPOINTMENT:UPDATE", "APPOINTMENT:READ"],
			includeDepartment: true,
		});

		// Create unauthorized context (different tenant)
		unauthorizedContext = await createAuthTestContext({
			roleName: "NURSE",
			rolePermissions: ["PATIENT:READ"],
			includeDepartment: true,
		});
		const unauthorizedTokens = await unauthorizedContext.issuePasswordTokens();
		unauthorizedToken = unauthorizedTokens.accessToken;

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
		today.setHours(10, 0, 0, 0);

		// Create a checked-in appointment
		const appointment = await Appointment.create({
			_id: uuidv4(),
			tenantId: doctorContext.hospitalId,
			appointmentNumber: `${doctorContext.hospitalId}-APT-${Date.now()}`,
			patientId,
			doctorId: doctorContext.staffId,
			departmentId: doctorContext.departmentId,
			date: today,
			timeSlot: { start: "10:00", end: "10:30" },
			type: "CONSULTATION",
			priority: "NORMAL",
			status: "CHECKED_IN",
			queueNumber: 1,
			checkedInAt: new Date(),
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
		await unauthorizedContext.cleanup();
		await doctorContext.cleanup();
	});

	it("returns 403 when user lacks APPOINTMENT:UPDATE permission", async () => {
		const response = await request(app)
			.post(`/api/appointments/${appointmentId}/complete`)
			.set("Authorization", `Bearer ${unauthorizedToken}`);

		expect(response.status).toBe(403);
	});
});

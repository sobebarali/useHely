import { Appointment, Patient } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/appointments/:id/check-in - Returns 403 without permission", () => {
	let context: AuthTestContext;
	let unauthorizedContext: AuthTestContext;
	let doctorContext: AuthTestContext;
	let unauthorizedToken: string;
	let patientId: string;
	let appointmentId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "RECEPTIONIST",
			rolePermissions: ["QUEUE:MANAGE", "APPOINTMENT:READ"],
			includeDepartment: true,
		});

		// Create unauthorized context
		unauthorizedContext = await createAuthTestContext({
			roleName: "NURSE",
			rolePermissions: ["PATIENT:READ"],
			includeDepartment: true,
		});
		const unauthorizedTokens = await unauthorizedContext.issuePasswordTokens();
		unauthorizedToken = unauthorizedTokens.accessToken;

		// Create a doctor
		doctorContext = await createAuthTestContext({
			roleName: "DOCTOR",
			rolePermissions: ["APPOINTMENT:READ"],
			includeDepartment: true,
			staffOverrides: {
				departmentId: context.departmentId,
			},
		});

		// Create a patient
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

		// Create a scheduled appointment for today
		const today = new Date();
		today.setHours(14, 0, 0, 0);

		const appointment = await Appointment.create({
			_id: uuidv4(),
			tenantId: context.hospitalId,
			appointmentNumber: `${context.hospitalId}-A-${Date.now()}`,
			patientId,
			doctorId: doctorContext.staffId,
			departmentId: context.departmentId,
			date: today,
			timeSlot: {
				start: "14:00",
				end: "14:30",
			},
			type: "CONSULTATION",
			priority: "NORMAL",
			status: "SCHEDULED",
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
		await unauthorizedContext.cleanup();
		await context.cleanup();
	});

	it("returns 403 when user lacks QUEUE:MANAGE permission", async () => {
		const response = await request(app)
			.post(`/api/appointments/${appointmentId}/check-in`)
			.set("Authorization", `Bearer ${unauthorizedToken}`);

		expect(response.status).toBe(403);
	});
});

import { Appointment, Patient } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/appointments - Filters appointments by patient ID", () => {
	let context: AuthTestContext;
	let doctorContext: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	const createdAppointmentIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "RECEPTIONIST",
			rolePermissions: ["APPOINTMENT:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		doctorContext = await createAuthTestContext({
			roleName: "DOCTOR",
			rolePermissions: ["APPOINTMENT:READ"],
			includeDepartment: true,
			staffOverrides: {
				departmentId: context.departmentId,
			},
		});

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

		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);

		for (let i = 0; i < 3; i++) {
			const appointment = await Appointment.create({
				_id: uuidv4(),
				tenantId: context.hospitalId,
				appointmentNumber: `${context.hospitalId}-A-${Date.now()}-${i}`,
				patientId,
				doctorId: doctorContext.staffId,
				departmentId: context.departmentId,
				date: tomorrow,
				timeSlot: {
					start: `${10 + i}:00`,
					end: `${10 + i}:30`,
				},
				type: "CONSULTATION",
				priority: "NORMAL",
				status: "SCHEDULED",
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			createdAppointmentIds.push(String(appointment._id));
		}
	}, 30000);

	afterAll(async () => {
		for (const id of createdAppointmentIds) {
			await Appointment.deleteOne({ _id: id });
		}
		if (patientId) {
			await Patient.deleteOne({ _id: patientId });
		}
		await doctorContext.cleanup();
		await context.cleanup();
	});

	it("filters appointments by patientId", async () => {
		const response = await request(app)
			.get("/api/appointments")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ patientId });

		expect(response.status).toBe(200);
		expect(response.body.data.length).toBeGreaterThanOrEqual(3);
		for (const appointment of response.body.data) {
			expect(appointment.patient.id).toBe(patientId);
		}
	});
});

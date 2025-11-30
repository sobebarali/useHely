import { Appointment, Patient } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/appointments/:id/complete - Complete appointment success", () => {
	let doctorContext: AuthTestContext;
	let doctorAccessToken: string;
	let patientId: string;
	let appointmentId: string;

	beforeAll(async () => {
		// Create doctor context - the doctor completing the appointment
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

		// Create a checked-in appointment for today assigned to this doctor
		const today = new Date();
		today.setHours(10, 0, 0, 0);

		const appointment = await Appointment.create({
			_id: uuidv4(),
			tenantId: doctorContext.hospitalId,
			appointmentNumber: `${doctorContext.hospitalId}-APT-${Date.now()}`,
			patientId,
			doctorId: doctorContext.staffId, // Assigned to this doctor
			departmentId: doctorContext.departmentId,
			date: today,
			timeSlot: { start: "10:00", end: "10:30" },
			type: "CONSULTATION",
			priority: "NORMAL",
			status: "CHECKED_IN", // Must be checked in to complete
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
		await doctorContext.cleanup();
	});

	it("completes a checked-in appointment", async () => {
		const response = await request(app)
			.post(`/api/appointments/${appointmentId}/complete`)
			.set("Authorization", `Bearer ${doctorAccessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.id).toBe(appointmentId);
		expect(response.body.status).toBe("COMPLETED");
		expect(response.body).toHaveProperty("completedAt");
	});

	it("completes appointment with notes and follow-up", async () => {
		// Create another checked-in appointment
		const today = new Date();
		today.setHours(11, 0, 0, 0);

		const newAppointment = await Appointment.create({
			_id: uuidv4(),
			tenantId: doctorContext.hospitalId,
			appointmentNumber: `${doctorContext.hospitalId}-APT-${Date.now()}-2`,
			patientId,
			doctorId: doctorContext.staffId,
			departmentId: doctorContext.departmentId,
			date: today,
			timeSlot: { start: "11:00", end: "11:30" },
			type: "CONSULTATION",
			priority: "NORMAL",
			status: "CHECKED_IN",
			queueNumber: 2,
			checkedInAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		const newAppointmentId = String(newAppointment._id);

		const nextWeek = new Date();
		nextWeek.setDate(nextWeek.getDate() + 7);

		const response = await request(app)
			.post(`/api/appointments/${newAppointmentId}/complete`)
			.set("Authorization", `Bearer ${doctorAccessToken}`)
			.send({
				notes: "Patient recovering well. Prescribed medication for 7 days.",
				followUpRequired: true,
				followUpDate: nextWeek.toISOString(),
			});

		expect(response.status).toBe(200);
		expect(response.body.status).toBe("COMPLETED");
		expect(response.body.notes).toBe(
			"Patient recovering well. Prescribed medication for 7 days.",
		);
		expect(response.body.followUpRequired).toBe(true);
		expect(response.body).toHaveProperty("followUpDate");

		// Cleanup
		await Appointment.deleteOne({ _id: newAppointmentId });
	});
});

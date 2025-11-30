import { Appointment, Patient, Role, Staff, User } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("DELETE /api/appointments/:id - Cancel appointment errors", () => {
	let context: AuthTestContext;
	let unauthorizedContext: AuthTestContext;
	let accessToken: string;
	let unauthorizedToken: string;
	let patientId: string;
	let doctorStaffId: string;
	let doctorUserId: string;
	let doctorRoleId: string;
	let cancelledAppointmentId: string;
	let completedAppointmentId: string;
	let scheduledAppointmentId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "RECEPTIONIST",
			rolePermissions: ["APPOINTMENT:DELETE", "APPOINTMENT:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create unauthorized context
		unauthorizedContext = await createAuthTestContext({
			roleName: "NURSE",
			rolePermissions: ["PATIENT:READ"],
			includeDepartment: true,
		});
		const unauthorizedTokens = await unauthorizedContext.issuePasswordTokens();
		unauthorizedToken = unauthorizedTokens.accessToken;

		// Create a doctor role
		const doctorRole = await Role.create({
			_id: uuidv4(),
			tenantId: context.hospitalId,
			name: "DOCTOR",
			description: "Doctor role for tests",
			permissions: ["APPOINTMENT:READ"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		doctorRoleId = String(doctorRole._id);

		// Create a doctor user
		const doctorUser = await User.create({
			_id: uuidv4(),
			name: "Test Doctor",
			email: `doctor-${context.uniqueId}@test.com`,
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		doctorUserId = String(doctorUser._id);

		// Create doctor staff
		const doctorStaff = await Staff.create({
			_id: uuidv4(),
			tenantId: context.hospitalId,
			userId: doctorUserId,
			employeeId: `DOC-${context.uniqueId}`,
			firstName: "Test",
			lastName: "Doctor",
			phone: "+1234567891",
			departmentId: context.departmentId,
			roles: [doctorRoleId],
			specialization: "General Medicine",
			shift: "MORNING",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		doctorStaffId = String(doctorStaff._id);

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

		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);

		// Create a scheduled appointment
		const scheduledAppointment = await Appointment.create({
			_id: uuidv4(),
			tenantId: context.hospitalId,
			appointmentNumber: `${context.hospitalId}-APT-${Date.now()}-1`,
			patientId,
			doctorId: doctorStaffId,
			departmentId: context.departmentId,
			date: tomorrow,
			timeSlot: { start: "10:00", end: "10:30" },
			type: "CONSULTATION",
			priority: "NORMAL",
			status: "SCHEDULED",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		scheduledAppointmentId = String(scheduledAppointment._id);

		// Create a cancelled appointment
		const cancelledAppointment = await Appointment.create({
			_id: uuidv4(),
			tenantId: context.hospitalId,
			appointmentNumber: `${context.hospitalId}-APT-${Date.now()}-2`,
			patientId,
			doctorId: doctorStaffId,
			departmentId: context.departmentId,
			date: tomorrow,
			timeSlot: { start: "11:00", end: "11:30" },
			type: "CONSULTATION",
			priority: "NORMAL",
			status: "CANCELLED",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		cancelledAppointmentId = String(cancelledAppointment._id);

		// Create a completed appointment
		const completedAppointment = await Appointment.create({
			_id: uuidv4(),
			tenantId: context.hospitalId,
			appointmentNumber: `${context.hospitalId}-APT-${Date.now()}-3`,
			patientId,
			doctorId: doctorStaffId,
			departmentId: context.departmentId,
			date: tomorrow,
			timeSlot: { start: "12:00", end: "12:30" },
			type: "CONSULTATION",
			priority: "NORMAL",
			status: "COMPLETED",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		completedAppointmentId = String(completedAppointment._id);
	}, 30000);

	afterAll(async () => {
		await Appointment.deleteMany({
			_id: {
				$in: [
					scheduledAppointmentId,
					cancelledAppointmentId,
					completedAppointmentId,
				],
			},
		});
		if (patientId) {
			await Patient.deleteOne({ _id: patientId });
		}
		if (doctorStaffId) {
			await Staff.deleteOne({ _id: doctorStaffId });
		}
		if (doctorUserId) {
			await User.deleteOne({ _id: doctorUserId });
		}
		if (doctorRoleId) {
			await Role.deleteOne({ _id: doctorRoleId });
		}
		await unauthorizedContext.cleanup();
		await context.cleanup();
	});

	it("returns 404 for non-existent appointment", async () => {
		const fakeId = uuidv4();
		const response = await request(app)
			.delete(`/api/appointments/${fakeId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body.code).toBe("NOT_FOUND");
	});

	it("returns 400 when cancelling already cancelled appointment", async () => {
		const response = await request(app)
			.delete(`/api/appointments/${cancelledAppointmentId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("ALREADY_CANCELLED");
	});

	it("returns 400 when cancelling completed appointment", async () => {
		const response = await request(app)
			.delete(`/api/appointments/${completedAppointmentId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("ALREADY_COMPLETED");
	});

	it("returns 403 when user lacks APPOINTMENT:DELETE permission", async () => {
		const response = await request(app)
			.delete(`/api/appointments/${scheduledAppointmentId}`)
			.set("Authorization", `Bearer ${unauthorizedToken}`);

		expect(response.status).toBe(403);
	});
});

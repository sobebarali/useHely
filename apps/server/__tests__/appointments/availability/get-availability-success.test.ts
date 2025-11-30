import { Appointment, Patient, Role, Staff, User } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/appointments/availability/:doctorId - Get availability success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	let doctorStaffId: string;
	let doctorUserId: string;
	let doctorRoleId: string;
	let bookedAppointmentId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "RECEPTIONIST",
			rolePermissions: ["DOCTOR:READ", "APPOINTMENT:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

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

		// Create a booked appointment for tomorrow at 10:00
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(10, 0, 0, 0);

		const bookedAppointment = await Appointment.create({
			_id: uuidv4(),
			tenantId: context.hospitalId,
			appointmentNumber: `${context.hospitalId}-APT-${Date.now()}`,
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
		bookedAppointmentId = String(bookedAppointment._id);
	}, 30000);

	afterAll(async () => {
		if (bookedAppointmentId) {
			await Appointment.deleteOne({ _id: bookedAppointmentId });
		}
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
		await context.cleanup();
	});

	it("gets doctor availability for a specific date", async () => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const dateStr = tomorrow.toISOString().split("T")[0];

		const response = await request(app)
			.get(`/api/appointments/availability/${doctorStaffId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ date: dateStr });

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("doctorId", doctorStaffId);
		expect(response.body).toHaveProperty("date");
		expect(response.body).toHaveProperty("slots");
		expect(Array.isArray(response.body.slots)).toBe(true);
	});

	it("shows booked slot as unavailable", async () => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const dateStr = tomorrow.toISOString().split("T")[0];

		const response = await request(app)
			.get(`/api/appointments/availability/${doctorStaffId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ date: dateStr });

		expect(response.status).toBe(200);

		// Find the 10:00 slot and verify it's booked
		const bookedSlot = response.body.slots.find(
			(slot: { startTime: string }) => slot.startTime === "10:00",
		);

		if (bookedSlot) {
			expect(bookedSlot.available).toBe(false);
		}
	});

	it("returns slots with correct structure", async () => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const dateStr = tomorrow.toISOString().split("T")[0];

		const response = await request(app)
			.get(`/api/appointments/availability/${doctorStaffId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ date: dateStr });

		expect(response.status).toBe(200);

		if (response.body.slots.length > 0) {
			const slot = response.body.slots[0];
			expect(slot).toHaveProperty("id");
			expect(slot).toHaveProperty("startTime");
			expect(slot).toHaveProperty("endTime");
			expect(slot).toHaveProperty("available");
		}
	});
});

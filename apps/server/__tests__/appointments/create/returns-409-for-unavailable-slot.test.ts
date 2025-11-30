import { Appointment, Patient, Role, Staff, User } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/appointments - Returns 409 for unavailable slot", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	let anotherPatientId: string;
	let doctorStaffId: string;
	let doctorUserId: string;
	let doctorRoleId: string;
	let existingAppointmentId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "RECEPTIONIST",
			rolePermissions: ["APPOINTMENT:CREATE"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

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

		const doctorUser = await User.create({
			_id: uuidv4(),
			name: "Test Doctor",
			email: `doctor-${context.uniqueId}@test.com`,
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		doctorUserId = String(doctorUser._id);

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

		// Create first patient with existing appointment
		const patient = await Patient.create({
			_id: uuidv4(),
			tenantId: context.hospitalId,
			patientId: `${context.hospitalId}-P-${Date.now()}-1`,
			firstName: "First",
			lastName: "Patient",
			dateOfBirth: new Date("1990-01-15"),
			gender: "MALE",
			phone: `+1-${context.uniqueId}-1`,
			patientType: "OPD",
			status: "ACTIVE",
			emergencyContact: {
				name: "Emergency Contact",
				relationship: "Spouse",
				phone: "+1-555-0001",
			},
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		patientId = String(patient._id);

		// Create another patient trying to book same slot
		const anotherPatient = await Patient.create({
			_id: uuidv4(),
			tenantId: context.hospitalId,
			patientId: `${context.hospitalId}-P-${Date.now()}-2`,
			firstName: "Another",
			lastName: "Patient",
			dateOfBirth: new Date("1985-05-20"),
			gender: "FEMALE",
			phone: `+1-${context.uniqueId}-2`,
			patientType: "OPD",
			status: "ACTIVE",
			emergencyContact: {
				name: "Emergency Contact",
				relationship: "Sibling",
				phone: "+1-555-0002",
			},
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		anotherPatientId = String(anotherPatient._id);

		// Create an existing appointment for tomorrow at 10:00
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(10, 0, 0, 0);

		const existingAppointment = await Appointment.create({
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
		existingAppointmentId = String(existingAppointment._id);
	}, 30000);

	afterAll(async () => {
		if (existingAppointmentId) {
			await Appointment.deleteOne({ _id: existingAppointmentId });
		}
		if (patientId) {
			await Patient.deleteOne({ _id: patientId });
		}
		if (anotherPatientId) {
			await Patient.deleteOne({ _id: anotherPatientId });
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

	it("returns 409 when time slot is already booked", async () => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(10, 0, 0, 0);

		const payload = {
			patientId: anotherPatientId,
			doctorId: doctorStaffId,
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

		expect(response.status).toBe(409);
		expect(response.body.code).toBe("SLOT_UNAVAILABLE");
	});
});

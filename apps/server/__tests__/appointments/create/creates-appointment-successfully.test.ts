import { Appointment, Patient, Role, Staff, User } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/appointments - Creates appointment successfully", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	let doctorStaffId: string;
	let doctorUserId: string;
	let doctorRoleId: string;
	let createdAppointmentId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "RECEPTIONIST",
			rolePermissions: [
				"APPOINTMENT:CREATE",
				"APPOINTMENT:READ",
				"PATIENT:CREATE",
				"PATIENT:READ",
			],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		const doctorRole = await Role.create({
			_id: uuidv4(),
			tenantId: context.hospitalId,
			name: "DOCTOR",
			description: "Doctor role for tests",
			permissions: ["APPOINTMENT:READ", "APPOINTMENT:UPDATE"],
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

		const patient = await Patient.create({
			_id: uuidv4(),
			tenantId: context.hospitalId,
			patientId: `${context.hospitalId}-P-${Date.now()}`,
			firstName: "Test",
			lastName: "Patient",
			dateOfBirth: new Date("1990-01-15"),
			gender: "MALE",
			phone: `+1-${context.uniqueId}`,
			email: `patient-${context.uniqueId}@test.com`,
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
		if (createdAppointmentId) {
			await Appointment.deleteOne({ _id: createdAppointmentId });
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

	it("creates a new appointment successfully", async () => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(10, 0, 0, 0);

		const payload = {
			patientId,
			doctorId: doctorStaffId,
			departmentId: context.departmentId,
			date: tomorrow.toISOString(),
			timeSlot: {
				start: "10:00",
				end: "10:30",
			},
			type: "CONSULTATION",
			priority: "NORMAL",
			reason: "Regular checkup",
		};

		const response = await request(app)
			.post("/api/appointments")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("id");
		expect(response.body).toHaveProperty("appointmentNumber");
		expect(response.body.patient.id).toBe(patientId);
		expect(response.body.doctor.id).toBe(doctorStaffId);
		expect(response.body.type).toBe("CONSULTATION");
		expect(response.body.priority).toBe("NORMAL");
		expect(response.body.status).toBe("SCHEDULED");

		createdAppointmentId = response.body.id;
	});
});

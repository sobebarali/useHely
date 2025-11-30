import { Appointment, Patient, Role, Staff, User } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/appointments/queue - Get queue success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let patientId: string;
	let doctorStaffId: string;
	let doctorUserId: string;
	let doctorRoleId: string;
	const createdAppointmentIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "RECEPTIONIST",
			rolePermissions: ["QUEUE:READ", "APPOINTMENT:READ"],
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

		// Create checked-in appointments for today
		const today = new Date();
		today.setHours(10, 0, 0, 0);

		for (let i = 0; i < 3; i++) {
			const appointment = await Appointment.create({
				_id: uuidv4(),
				tenantId: context.hospitalId,
				appointmentNumber: `${context.hospitalId}-APT-${Date.now()}-${i}`,
				patientId,
				doctorId: doctorStaffId,
				departmentId: context.departmentId,
				date: today,
				timeSlot: {
					start: `${10 + i}:00`,
					end: `${10 + i}:30`,
				},
				type: "CONSULTATION",
				priority: "NORMAL",
				status: "CHECKED_IN",
				queueNumber: i + 1,
				checkedInAt: new Date(Date.now() - (3 - i) * 60000), // Stagger check-in times
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

	it("gets the OPD queue for today", async () => {
		const response = await request(app)
			.get("/api/appointments/queue")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("queue");
		expect(response.body).toHaveProperty("currentNumber");
		expect(response.body).toHaveProperty("totalWaiting");
		expect(Array.isArray(response.body.queue)).toBe(true);
	});

	it("filters queue by doctorId", async () => {
		const response = await request(app)
			.get("/api/appointments/queue")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ doctorId: doctorStaffId });

		expect(response.status).toBe(200);
		expect(response.body.queue.length).toBeGreaterThanOrEqual(3);
	});

	it("filters queue by departmentId", async () => {
		const response = await request(app)
			.get("/api/appointments/queue")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ departmentId: context.departmentId });

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("queue");
	});

	it("returns queue items with correct structure", async () => {
		const response = await request(app)
			.get("/api/appointments/queue")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ doctorId: doctorStaffId });

		expect(response.status).toBe(200);

		if (response.body.queue.length > 0) {
			const queueItem = response.body.queue[0];
			expect(queueItem).toHaveProperty("queueNumber");
			expect(queueItem).toHaveProperty("appointment");
			expect(queueItem).toHaveProperty("patient");
			expect(queueItem).toHaveProperty("checkedInAt");
			expect(queueItem).toHaveProperty("estimatedTime");
			expect(queueItem).toHaveProperty("status");
		}
	});
});

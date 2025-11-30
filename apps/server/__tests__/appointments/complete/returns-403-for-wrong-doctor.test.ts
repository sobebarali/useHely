import { Account, Appointment, Patient, Role, Staff, User } from "@hms/db";
import bcrypt from "bcryptjs";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/appointments/:id/complete - Returns 403 when wrong doctor tries to complete", () => {
	let doctorContext: AuthTestContext;
	let anotherDoctorToken: string;
	let patientId: string;
	let appointmentId: string;

	// For another doctor within the same tenant
	let anotherDoctorUserId: string;
	let anotherDoctorStaffId: string;
	let anotherDoctorRoleId: string;
	let anotherDoctorAccountId: string;

	beforeAll(async () => {
		// Create doctor context
		doctorContext = await createAuthTestContext({
			roleName: "DOCTOR",
			rolePermissions: ["APPOINTMENT:UPDATE", "APPOINTMENT:READ"],
			includeDepartment: true,
		});

		// Create another doctor in the SAME hospital (same tenant)
		const anotherDoctorRole = await Role.create({
			_id: uuidv4(),
			tenantId: doctorContext.hospitalId,
			name: "DOCTOR2",
			description: "Another Doctor role for tests",
			permissions: ["APPOINTMENT:UPDATE", "APPOINTMENT:READ"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		anotherDoctorRoleId = String(anotherDoctorRole._id);

		const anotherDoctorUser = await User.create({
			_id: uuidv4(),
			name: "Another Doctor",
			email: `doctor2-${doctorContext.uniqueId}@test.com`,
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		anotherDoctorUserId = String(anotherDoctorUser._id);

		const anotherDoctorStaff = await Staff.create({
			_id: uuidv4(),
			tenantId: doctorContext.hospitalId,
			userId: anotherDoctorUserId,
			employeeId: `DOC2-${doctorContext.uniqueId}`,
			firstName: "Another",
			lastName: "Doctor",
			phone: "+1234567899",
			departmentId: doctorContext.departmentId,
			roles: [anotherDoctorRoleId],
			specialization: "Cardiology",
			shift: "MORNING",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		anotherDoctorStaffId = String(anotherDoctorStaff._id);

		// Create account for another doctor
		const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
		anotherDoctorAccountId = uuidv4();
		await Account.create({
			_id: anotherDoctorAccountId,
			accountId: anotherDoctorAccountId,
			userId: anotherDoctorUserId,
			providerId: "credential",
			password: hashedPassword,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Issue tokens for another doctor
		const anotherDoctorResponse = await request(app)
			.post("/api/auth/token")
			.send({
				grant_type: "password",
				username: `doctor2-${doctorContext.uniqueId}@test.com`,
				password: "TestPassword123!",
				tenant_id: doctorContext.hospitalId,
			});

		if (anotherDoctorResponse.status !== 200) {
			throw new Error(
				`Failed to create tokens for another doctor: ${anotherDoctorResponse.status}`,
			);
		}
		anotherDoctorToken = anotherDoctorResponse.body.access_token;

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

		// Create a checked-in appointment assigned to the first doctor
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
		// Cleanup another doctor
		if (anotherDoctorAccountId) {
			await Account.deleteOne({ _id: anotherDoctorAccountId });
		}
		if (anotherDoctorStaffId) {
			await Staff.deleteOne({ _id: anotherDoctorStaffId });
		}
		if (anotherDoctorUserId) {
			await User.deleteOne({ _id: anotherDoctorUserId });
		}
		if (anotherDoctorRoleId) {
			await Role.deleteOne({ _id: anotherDoctorRoleId });
		}
		await doctorContext.cleanup();
	});

	it("returns 403 when wrong doctor tries to complete", async () => {
		const response = await request(app)
			.post(`/api/appointments/${appointmentId}/complete`)
			.set("Authorization", `Bearer ${anotherDoctorToken}`);

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("FORBIDDEN");
	});
});

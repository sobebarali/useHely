import { Role, Staff, User } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/appointments/availability/:doctorId - Returns 400 for past date", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let doctorStaffId: string;
	let doctorUserId: string;
	let doctorRoleId: string;

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
	}, 30000);

	afterAll(async () => {
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

	it("returns 400 for past date", async () => {
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const dateStr = yesterday.toISOString().split("T")[0];

		const response = await request(app)
			.get(`/api/appointments/availability/${doctorStaffId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ date: dateStr });

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_DATE");
	});
});

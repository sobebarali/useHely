import { Role, Staff, User } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/appointments/availability/:doctorId - Returns 403 without permission", () => {
	let context: AuthTestContext;
	let unauthorizedContext: AuthTestContext;
	let unauthorizedToken: string;
	let doctorStaffId: string;
	let doctorUserId: string;
	let doctorRoleId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "RECEPTIONIST",
			rolePermissions: ["DOCTOR:READ", "APPOINTMENT:READ"],
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
		await unauthorizedContext.cleanup();
		await context.cleanup();
	});

	it("returns 403 when user lacks DOCTOR:READ permission", async () => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const dateStr = tomorrow.toISOString().split("T")[0];

		const response = await request(app)
			.get(`/api/appointments/availability/${doctorStaffId}`)
			.set("Authorization", `Bearer ${unauthorizedToken}`)
			.query({ date: dateStr });

		expect(response.status).toBe(403);
	});
});

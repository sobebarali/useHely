import { Account, Staff, User } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/users - Link existing user to new tenant", () => {
	let context: AuthTestContext;
	let secondContext: AuthTestContext;
	const createdStaffIds: string[] = [];

	// Email of user that exists in another tenant
	let existingUserEmail: string;
	let existingUserId: string;

	beforeAll(async () => {
		// Create first tenant context with a user
		context = await createAuthTestContext({
			rolePermissions: ["USER:CREATE", "USER:READ"],
			includeDepartment: true,
		});
		await context.issuePasswordTokens();

		// Create second tenant where we'll try to add the existing user
		secondContext = await createAuthTestContext({
			rolePermissions: ["USER:CREATE", "USER:READ"],
			includeDepartment: true,
		});

		// Create an existing user in the first tenant (simulating someone who works at Hospital A)
		const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		existingUserEmail = `existing-multi-tenant-${uniqueId}@test.com`;

		// Create user and staff in first context's tenant
		const { v4: uuidv4 } = await import("uuid");
		const bcrypt = await import("bcryptjs");

		existingUserId = uuidv4();
		await User.create({
			_id: existingUserId,
			name: "Existing Multi-Tenant User",
			email: existingUserEmail,
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create account for existing user
		const accountId = uuidv4();
		const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
		await Account.create({
			_id: accountId,
			accountId: accountId,
			userId: existingUserId,
			providerId: "credential",
			password: hashedPassword,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create staff record in first tenant
		const staffId = uuidv4();
		await Staff.create({
			_id: staffId,
			tenantId: context.hospitalId,
			userId: existingUserId,
			employeeId: `EMP-EXIST-${uniqueId}`,
			firstName: "Existing",
			lastName: "User",
			phone: "+1234567890",
			departmentId: context.departmentId,
			roles: context.roleIds,
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		createdStaffIds.push(staffId);
	}, 60000);

	afterAll(async () => {
		// Clean up created staff records
		for (const staffId of createdStaffIds) {
			await Staff.deleteOne({ _id: staffId });
		}

		// Clean up the existing user we created
		if (existingUserId) {
			await Account.deleteOne({ userId: existingUserId });
			await Staff.deleteMany({ userId: existingUserId });
			await User.deleteOne({ _id: existingUserId });
		}

		await context.cleanup();
		await secondContext.cleanup();
	});

	it("should link existing user to new tenant instead of creating duplicate User", async () => {
		// Get tokens for second tenant
		const secondTokens = await secondContext.issuePasswordTokens();

		const payload = {
			firstName: "Existing",
			lastName: "User",
			email: existingUserEmail, // Email that already exists in User collection
			phone: "+1234567891",
			department: secondContext.departmentId,
			roles: secondContext.roleIds,
			specialization: "Multi-Tenant Specialist",
			shift: "MORNING",
		};

		const response = await request(app)
			.post("/api/users")
			.set("Authorization", `Bearer ${secondTokens.accessToken}`)
			.send(payload);

		expect(response.status).toBe(201);
		expect(response.body.email).toBe(existingUserEmail);
		expect(response.body.id).toBeDefined();

		createdStaffIds.push(response.body.id);

		// Verify that NO new User was created - should reuse existing
		const users = await User.find({ email: existingUserEmail });
		expect(users.length).toBe(1); // Only one User record should exist
		expect(String(users[0]?._id)).toBe(existingUserId);

		// Verify Staff record was created in the new tenant
		const newStaff = await Staff.findById(response.body.id);
		expect(newStaff).not.toBeNull();
		expect(newStaff?.tenantId).toBe(secondContext.hospitalId);
		expect(newStaff?.userId).toBe(existingUserId);

		// Verify user now has staff records in both tenants
		const allStaffRecords = await Staff.find({ userId: existingUserId });
		expect(allStaffRecords.length).toBe(2);

		const tenantIds = allStaffRecords.map((s) => s.tenantId);
		expect(tenantIds).toContain(context.hospitalId);
		expect(tenantIds).toContain(secondContext.hospitalId);
	});

	it("should indicate user was linked (not newly created) in response", async () => {
		// Create another tenant to test
		const thirdContext = await createAuthTestContext({
			rolePermissions: ["USER:CREATE", "USER:READ"],
			includeDepartment: true,
		});

		try {
			const thirdTokens = await thirdContext.issuePasswordTokens();

			const payload = {
				firstName: "Existing",
				lastName: "User",
				email: existingUserEmail,
				phone: "+1234567892",
				department: thirdContext.departmentId,
				roles: thirdContext.roleIds,
				shift: "EVENING",
			};

			const response = await request(app)
				.post("/api/users")
				.set("Authorization", `Bearer ${thirdTokens.accessToken}`)
				.send(payload);

			expect(response.status).toBe(201);

			// Response should indicate this is a linked user (no temporary password sent)
			// Message should be different from new user creation
			expect(response.body.message).toMatch(/existing|linked|credentials/i);

			createdStaffIds.push(response.body.id);
		} finally {
			await thirdContext.cleanup();
		}
	});
});

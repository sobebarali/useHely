import { Account, Hospital, Role, Staff, User } from "@hms/db";
import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordFailedLogin } from "../../../../server/src/lib/cache/auth.cache";
import { app } from "../../../src/index";

describe("POST /api/auth/token - Account Locked", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

	let hospitalId: string;
	let userId: string;
	let staffId: string;
	let roleId: string;
	let password: string;
	let userEmail: string;

	beforeAll(async () => {
		// Create test hospital
		const hospital = await Hospital.create({
			_id: `hospital-${uniqueId}`,
			name: `Test Hospital ${uniqueId}`,
			slug: `test-hospital-${uniqueId}`,
			licenseNumber: `LIC-${uniqueId}`,
			address: {
				street: "123 Test St",
				city: "Test City",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			contactEmail: `contact-${uniqueId}@test.com`,
			contactPhone: "+1234567890",
			adminEmail: `admin-${uniqueId}@test.com`,
			adminPhone: "+0987654321",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		hospitalId = String(hospital._id);

		// Create test user
		userEmail = `user-${uniqueId}@test.com`;
		const user = await User.create({
			_id: `user-${uniqueId}`,
			name: "Test User",
			email: userEmail,
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		userId = String(user._id);

		// Create test role
		const role = await Role.create({
			_id: `role-${uniqueId}`,
			tenantId: hospitalId,
			name: "DOCTOR",
			description: "Test doctor role",
			permissions: ["PATIENT:READ", "PRESCRIPTION:CREATE"],
			isSystem: false,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		roleId = String(role._id);

		// Create test staff
		const staff = await Staff.create({
			_id: `staff-${uniqueId}`,
			tenantId: hospitalId,
			userId,
			employeeId: `EMP-${uniqueId}`,
			firstName: "Test",
			lastName: "User",
			phone: "+1234567890",
			roles: [roleId],
			specialization: "General Practice",
			shift: "MORNING",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		staffId = String(staff._id);

		// Create password and account
		password = "TestPassword123!";
		const hashedPassword = await bcrypt.hash(password, 10);

		await Account.create({
			_id: `account-${uniqueId}`,
			accountId: `account-${uniqueId}`,
			userId,
			providerId: "credential",
			password: hashedPassword,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	});

	afterAll(async () => {
		// Clean up test data
		await Account.deleteOne({ userId });
		await Staff.deleteOne({ _id: staffId });
		await Role.deleteOne({ _id: roleId });
		await User.deleteOne({ _id: userId });
		await Hospital.deleteOne({ _id: hospitalId });
	});

	it("should lock account after 5 failed login attempts", async () => {
		// Make 5 failed login attempts
		for (let i = 0; i < 5; i++) {
			const response = await request(app).post("/api/auth/token").send({
				grant_type: "password",
				username: userEmail,
				password: "WrongPassword123!",
				tenant_id: hospitalId,
			});

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty("code", "INVALID_CREDENTIALS");
		}

		// 6th attempt should be locked
		const lockedResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: "WrongPassword123!",
			tenant_id: hospitalId,
		});

		expect(lockedResponse.status).toBe(403);
		expect(lockedResponse.body).toHaveProperty("code", "ACCOUNT_LOCKED");
		expect(lockedResponse.body).toHaveProperty(
			"message",
			"Account is locked due to too many failed login attempts. Please try again later.",
		);
	});

	it("should reject correct credentials when account is locked", async () => {
		// Account should already be locked from previous test
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password, // Correct password
			tenant_id: hospitalId,
		});

		expect(response.status).toBe(403);
		expect(response.body).toHaveProperty("code", "ACCOUNT_LOCKED");
		expect(response.body).toHaveProperty(
			"message",
			"Account is locked due to too many failed login attempts. Please try again later.",
		);
	});

	it("should manually lock account and reject authentication", async () => {
		// Create another user for manual lock test
		const manualLockUserId = `manual-lock-user-${uniqueId}`;
		const manualLockEmail = `manual-lock-${uniqueId}@test.com`;

		await User.create({
			_id: manualLockUserId,
			name: "Manual Lock User",
			email: manualLockEmail,
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const hashedPassword = await bcrypt.hash(password, 10);
		await Account.create({
			_id: `manual-lock-account-${uniqueId}`,
			accountId: `manual-lock-account-${uniqueId}`,
			userId: manualLockUserId,
			providerId: "credential",
			password: hashedPassword,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const manualLockStaffId = `manual-lock-staff-${uniqueId}`;
		await Staff.create({
			_id: manualLockStaffId,
			tenantId: hospitalId,
			userId: manualLockUserId,
			employeeId: `EMP-MANUAL-${uniqueId}`,
			firstName: "Manual",
			lastName: "Lock",
			phone: "+1234567893",
			roles: [roleId],
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Manually lock the account (match max attempts threshold)
		for (let i = 0; i < 5; i++) {
			await recordFailedLogin({ identifier: manualLockEmail });
		}

		const response = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: manualLockEmail,
			password, // Correct password
			tenant_id: hospitalId,
		});

		expect(response.status).toBe(403);
		expect(response.body).toHaveProperty("code", "ACCOUNT_LOCKED");

		// Clean up
		await Account.deleteOne({ userId: manualLockUserId });
		await Staff.deleteOne({ _id: manualLockStaffId });
		await User.deleteOne({ _id: manualLockUserId });
	});
});

import { Account, Hospital, Role, Staff, User } from "@hms/db";
import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/auth/token - Invalid Credentials", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
	const invalidUsername = `invalid-${uniqueId}@test.com`;

	let hospitalId: string;
	let userId: string;
	let staffId: string;
	let roleId: string;
	let password: string;

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
		const user = await User.create({
			_id: `user-${uniqueId}`,
			name: "Test User",
			email: `user-${uniqueId}@test.com`,
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

	it("should reject invalid username", async () => {
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: invalidUsername,
			password,
			tenant_id: hospitalId,
		});

		expect(response.status).toBe(401);
		expect(response.body).toHaveProperty("code", "INVALID_CREDENTIALS");
		expect(response.body).toHaveProperty(
			"message",
			"Invalid username or password",
		);
	});

	it("should reject invalid password", async () => {
		const response = await request(app)
			.post("/api/auth/token")
			.send({
				grant_type: "password",
				username: `user-${uniqueId}@test.com`,
				password: "WrongPassword123!",
				tenant_id: hospitalId,
			});

		expect(response.status).toBe(401);
		expect(response.body).toHaveProperty("code", "INVALID_CREDENTIALS");
		expect(response.body).toHaveProperty(
			"message",
			"Invalid username or password",
		);
	});

	it("should reject empty username", async () => {
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: "",
			password,
			tenant_id: hospitalId,
		});

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("code", "INVALID_REQUEST");
	});

	it("should reject empty password", async () => {
		const response = await request(app)
			.post("/api/auth/token")
			.send({
				grant_type: "password",
				username: `user-${uniqueId}@test.com`,
				password: "",
				tenant_id: hospitalId,
			});

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("code", "INVALID_REQUEST");
	});

	it("should reject user without staff record", async () => {
		// Create another user without staff record
		const orphanUserId = `orphan-user-${uniqueId}`;
		await User.create({
			_id: orphanUserId,
			name: "Orphan User",
			email: `orphan-${uniqueId}@test.com`,
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const hashedPassword = await bcrypt.hash(password, 10);
		await Account.create({
			_id: `orphan-account-${uniqueId}`,
			accountId: `orphan-account-${uniqueId}`,
			userId: orphanUserId,
			providerId: "credential",
			password: hashedPassword,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const response = await request(app)
			.post("/api/auth/token")
			.send({
				grant_type: "password",
				username: `orphan-${uniqueId}@test.com`,
				password,
				tenant_id: hospitalId,
			});

		expect(response.status).toBe(403);
		expect(response.body).toHaveProperty("code", "TENANT_INACTIVE");
		expect(response.body).toHaveProperty(
			"message",
			"You are not associated with this organization",
		);

		// Clean up
		await Account.deleteOne({ userId: orphanUserId });
		await User.deleteOne({ _id: orphanUserId });
	});

	it("should reject user without credential account", async () => {
		// Create another user without account
		const noAccountUserId = `no-account-user-${uniqueId}`;
		await User.create({
			_id: noAccountUserId,
			name: "No Account User",
			email: `noaccount-${uniqueId}@test.com`,
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const response = await request(app)
			.post("/api/auth/token")
			.send({
				grant_type: "password",
				username: `noaccount-${uniqueId}@test.com`,
				password,
				tenant_id: hospitalId,
			});

		expect(response.status).toBe(401);
		expect(response.body).toHaveProperty("code", "INVALID_CREDENTIALS");

		// Clean up
		await User.deleteOne({ _id: noAccountUserId });
	});
});

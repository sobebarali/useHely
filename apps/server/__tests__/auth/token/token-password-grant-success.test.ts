import { Account, Hospital, Role, Session, Staff, User } from "@hms/db";
import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/auth/token - Password Grant Success", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

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

	it("should successfully authenticate with valid credentials", async () => {
		const response = await request(app)
			.post("/api/auth/token")
			.send({
				grant_type: "password",
				username: `user-${uniqueId}@test.com`,
				password,
				tenant_id: hospitalId,
			});

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("access_token");
		expect(response.body).toHaveProperty("refresh_token");
		expect(response.body).toHaveProperty("token_type", "Bearer");
		expect(response.body).toHaveProperty("expires_in", 3600);
		expect(response.body).toHaveProperty("refresh_expires_in", 604800);

		// Verify tokens are stored in database
		const accessTokenSession = await Session.findOne({
			token: response.body.access_token,
		});
		expect(accessTokenSession).toBeTruthy();
		expect(accessTokenSession?.userId).toBe(userId);

		const refreshTokenSession = await Session.findOne({
			token: response.body.refresh_token,
		});
		expect(refreshTokenSession).toBeTruthy();
		expect(refreshTokenSession?.userId).toBe(userId);
	});

	it("should return different tokens for multiple requests", async () => {
		const response1 = await request(app)
			.post("/api/auth/token")
			.send({
				grant_type: "password",
				username: `user-${uniqueId}@test.com`,
				password,
				tenant_id: hospitalId,
			});

		const response2 = await request(app)
			.post("/api/auth/token")
			.send({
				grant_type: "password",
				username: `user-${uniqueId}@test.com`,
				password,
				tenant_id: hospitalId,
			});

		expect(response1.body.access_token).not.toBe(response2.body.access_token);
		expect(response1.body.refresh_token).not.toBe(response2.body.refresh_token);
	});

	it("should create sessions with proper expiry times", async () => {
		const response = await request(app)
			.post("/api/auth/token")
			.send({
				grant_type: "password",
				username: `user-${uniqueId}@test.com`,
				password,
				tenant_id: hospitalId,
			});

		const now = new Date();
		const accessSession = await Session.findOne({
			token: response.body.access_token,
		});
		const refreshSession = await Session.findOne({
			token: response.body.refresh_token,
		});

		// Access token should expire in ~1 hour
		expect(accessSession?.expiresAt).toBeInstanceOf(Date);
		const accessExpiryDiff =
			((accessSession?.expiresAt?.getTime() || 0) - now.getTime()) / 1000;
		expect(accessExpiryDiff).toBeGreaterThan(3500); // ~1 hour minus some buffer
		expect(accessExpiryDiff).toBeLessThan(3700);

		// Refresh token should expire in ~7 days
		expect(refreshSession?.expiresAt).toBeInstanceOf(Date);
		const refreshExpiryDiff =
			((refreshSession?.expiresAt?.getTime() || 0) - now.getTime()) / 1000;
		expect(refreshExpiryDiff).toBeGreaterThan(603000); // ~7 days minus some buffer
		expect(refreshExpiryDiff).toBeLessThan(605000);
	});

	it("should update staff last login timestamp", async () => {
		const beforeLogin = new Date();

		await request(app)
			.post("/api/auth/token")
			.send({
				grant_type: "password",
				username: `user-${uniqueId}@test.com`,
				password,
				tenant_id: hospitalId,
			});

		const staff = await Staff.findById(staffId);
		expect(staff?.lastLogin).toBeInstanceOf(Date);
		expect(staff?.lastLogin!.getTime()).toBeGreaterThan(beforeLogin.getTime());
	});
});

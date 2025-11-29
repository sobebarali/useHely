import { Account, Hospital, Role, Session, Staff, User } from "@hms/db";
import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/auth/token - Refresh Grant Success", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

	let hospitalId: string;
	let userId: string;
	let staffId: string;
	let roleId: string;
	let password: string;
	let initialAccessToken: string;
	let initialRefreshToken: string;

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

		// Get initial tokens using password grant
		const initialResponse = await request(app)
			.post("/api/auth/token")
			.send({
				grant_type: "password",
				username: `user-${uniqueId}@test.com`,
				password,
				tenant_id: hospitalId,
			});

		initialAccessToken = initialResponse.body.access_token;
		initialRefreshToken = initialResponse.body.refresh_token;
	});

	afterAll(async () => {
		// Clean up test data
		await Session.deleteMany({ userId });
		await Account.deleteOne({ userId });
		await Staff.deleteOne({ _id: staffId });
		await Role.deleteOne({ _id: roleId });
		await User.deleteOne({ _id: userId });
		await Hospital.deleteOne({ _id: hospitalId });
	});

	it("should successfully refresh tokens with valid refresh token", async () => {
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "refresh_token",
			refresh_token: initialRefreshToken,
		});

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("access_token");
		expect(response.body).toHaveProperty("refresh_token");
		expect(response.body).toHaveProperty("token_type", "Bearer");
		expect(response.body).toHaveProperty("expires_in", 3600);
		expect(response.body).toHaveProperty("refresh_expires_in");

		// Should return same refresh token
		expect(response.body.refresh_token).toBe(initialRefreshToken);

		// Should return a new access token
		expect(response.body.access_token).not.toBe(initialAccessToken);

		// Verify new access token is stored in database
		const newAccessSession = await Session.findOne({
			token: response.body.access_token,
		});
		expect(newAccessSession).toBeTruthy();
		expect(newAccessSession?.userId).toBe(userId);

		// Verify refresh token session still exists
		const refreshSession = await Session.findOne({
			token: initialRefreshToken,
		});
		expect(refreshSession).toBeTruthy();
		expect(refreshSession?.userId).toBe(userId);
	});

	it("should generate different access tokens on multiple refreshes", async () => {
		// First refresh
		const firstRefresh = await request(app).post("/api/auth/token").send({
			grant_type: "refresh_token",
			refresh_token: initialRefreshToken,
		});

		// Second refresh
		const secondRefresh = await request(app).post("/api/auth/token").send({
			grant_type: "refresh_token",
			refresh_token: initialRefreshToken,
		});

		expect(firstRefresh.body.access_token).not.toBe(
			secondRefresh.body.access_token,
		);
		expect(firstRefresh.body.refresh_token).toBe(
			secondRefresh.body.refresh_token,
		); // Same refresh token
	});

	it("should maintain proper session relationships", async () => {
		const refreshResponse = await request(app).post("/api/auth/token").send({
			grant_type: "refresh_token",
			refresh_token: initialRefreshToken,
		});

		// Count sessions for user
		const userSessions = await Session.find({ userId });

		// Should at least include initial access, initial refresh, new access from refresh
		expect(userSessions.length).toBeGreaterThanOrEqual(3);

		// Verify refresh token session is still valid
		const refreshSession = await Session.findOne({
			token: initialRefreshToken,
		});
		expect(refreshSession).toBeTruthy();

		// Verify new access token session exists
		const newAccessSession = await Session.findOne({
			token: refreshResponse.body.access_token,
		});
		expect(newAccessSession).toBeTruthy();
	});

	it("should work even if original access token has expired", async () => {
		// Manually expire initial access token
		await Session.updateOne(
			{ token: initialAccessToken },
			{ expiresAt: new Date(Date.now() - 1000) },
		);

		// Refresh should still work
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "refresh_token",
			refresh_token: initialRefreshToken,
		});

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("access_token");
		expect(response.body.access_token).not.toBe(initialAccessToken);
	});
});

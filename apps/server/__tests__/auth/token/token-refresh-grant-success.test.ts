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

		// Should return a NEW refresh token (token rotation for security)
		expect(response.body.refresh_token).not.toBe(initialRefreshToken);

		// Should return a new access token
		expect(response.body.access_token).not.toBe(initialAccessToken);

		// Verify new access token is stored in database
		const newAccessSession = await Session.findOne({
			token: response.body.access_token,
		});
		expect(newAccessSession).toBeTruthy();
		expect(newAccessSession?.userId).toBe(userId);

		// Verify NEW refresh token session exists
		const newRefreshSession = await Session.findOne({
			token: response.body.refresh_token,
		});
		expect(newRefreshSession).toBeTruthy();
		expect(newRefreshSession?.userId).toBe(userId);

		// Verify old refresh token session is deleted (rotated out)
		const oldRefreshSession = await Session.findOne({
			token: initialRefreshToken,
		});
		expect(oldRefreshSession).toBeFalsy();

		// Update initialRefreshToken for subsequent tests
		initialRefreshToken = response.body.refresh_token;
	});

	it("should generate different access and refresh tokens on multiple refreshes (token rotation)", async () => {
		// First refresh - get a fresh token pair first
		const firstRefresh = await request(app).post("/api/auth/token").send({
			grant_type: "refresh_token",
			refresh_token: initialRefreshToken,
		});

		expect(firstRefresh.status).toBe(200);
		const firstNewRefreshToken = firstRefresh.body.refresh_token;

		// Second refresh - must use the NEW refresh token from first refresh
		const secondRefresh = await request(app).post("/api/auth/token").send({
			grant_type: "refresh_token",
			refresh_token: firstNewRefreshToken,
		});

		expect(secondRefresh.status).toBe(200);

		// Access tokens should be different
		expect(firstRefresh.body.access_token).not.toBe(
			secondRefresh.body.access_token,
		);

		// Refresh tokens should also be different (rotation)
		expect(firstRefresh.body.refresh_token).not.toBe(
			secondRefresh.body.refresh_token,
		);

		// Update for subsequent tests
		initialRefreshToken = secondRefresh.body.refresh_token;
	});

	it("should maintain proper session relationships with token rotation", async () => {
		// Get a fresh token first
		const refreshResponse = await request(app).post("/api/auth/token").send({
			grant_type: "refresh_token",
			refresh_token: initialRefreshToken,
		});

		expect(refreshResponse.status).toBe(200);

		// Verify new access token session exists
		const newAccessSession = await Session.findOne({
			token: refreshResponse.body.access_token,
		});
		expect(newAccessSession).toBeTruthy();

		// Verify new refresh token session exists
		const newRefreshSession = await Session.findOne({
			token: refreshResponse.body.refresh_token,
		});
		expect(newRefreshSession).toBeTruthy();

		// Update for subsequent tests
		initialRefreshToken = refreshResponse.body.refresh_token;
	});

	it("should work even if original access token has expired", async () => {
		// Get a fresh refresh token to test with
		const freshTokens = await request(app).post("/api/auth/token").send({
			grant_type: "refresh_token",
			refresh_token: initialRefreshToken,
		});

		expect(freshTokens.status).toBe(200);
		const freshAccessToken = freshTokens.body.access_token;
		const freshRefreshToken = freshTokens.body.refresh_token;

		// Manually expire the access token
		await Session.updateOne(
			{ token: freshAccessToken },
			{ expiresAt: new Date(Date.now() - 1000) },
		);

		// Refresh should still work with the valid refresh token
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "refresh_token",
			refresh_token: freshRefreshToken,
		});

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("access_token");
		expect(response.body.access_token).not.toBe(freshAccessToken);
	});
});

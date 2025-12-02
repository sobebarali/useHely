import {
	Account,
	Department,
	Hospital,
	Role,
	Session,
	Staff,
	User,
} from "@hms/db";
import bcrypt from "bcryptjs";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/auth/token - Refresh token maintains correct tenant", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const userEmail = `refresh-tenant-${uniqueId}@test.com`;
	const password = "TestPassword123!";

	let userId: string;
	let hospitalAId: string;
	let hospitalBId: string;
	let roleAId: string;
	let roleBId: string;
	let departmentAId: string;
	let departmentBId: string;
	let staffAId: string;
	let staffBId: string;
	let refreshTokenA: string;
	let refreshTokenB: string;

	beforeAll(async () => {
		// Create a single user
		userId = uuidv4();
		const hashedPassword = await bcrypt.hash(password, 10);

		await User.create({
			_id: userId,
			name: "Refresh Tenant User",
			email: userEmail,
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create account
		const accountId = uuidv4();
		await Account.create({
			_id: accountId,
			accountId: accountId,
			userId: userId,
			providerId: "credential",
			password: hashedPassword,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create Hospital A
		hospitalAId = uuidv4();
		await Hospital.create({
			_id: hospitalAId,
			name: `Hospital A ${uniqueId}`,
			slug: `hospital-a-${uniqueId}`,
			licenseNumber: `LIC-A-${uniqueId}`,
			address: {
				street: "123 Hospital A St",
				city: "City A",
				state: "SA",
				postalCode: "11111",
				country: "USA",
			},
			contactEmail: `contact-a-${uniqueId}@hospital.com`,
			contactPhone: "+1111111111",
			adminEmail: `admin-a-${uniqueId}@hospital.com`,
			adminPhone: "+1111111112",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create Hospital B
		hospitalBId = uuidv4();
		await Hospital.create({
			_id: hospitalBId,
			name: `Hospital B ${uniqueId}`,
			slug: `hospital-b-${uniqueId}`,
			licenseNumber: `LIC-B-${uniqueId}`,
			address: {
				street: "456 Hospital B St",
				city: "City B",
				state: "SB",
				postalCode: "22222",
				country: "USA",
			},
			contactEmail: `contact-b-${uniqueId}@hospital.com`,
			contactPhone: "+2222222221",
			adminEmail: `admin-b-${uniqueId}@hospital.com`,
			adminPhone: "+2222222222",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create departments for each hospital
		departmentAId = uuidv4();
		await Department.create({
			_id: departmentAId,
			tenantId: hospitalAId,
			name: "Department A",
			code: `DEPT-A-${uniqueId}`,
			description: "Department at Hospital A",
			type: "CLINICAL",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		departmentBId = uuidv4();
		await Department.create({
			_id: departmentBId,
			tenantId: hospitalBId,
			name: "Department B",
			code: `DEPT-B-${uniqueId}`,
			description: "Department at Hospital B",
			type: "CLINICAL",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create roles for each hospital with different permissions
		roleAId = uuidv4();
		await Role.create({
			_id: roleAId,
			tenantId: hospitalAId,
			name: "DOCTOR",
			description: "Doctor role at Hospital A",
			permissions: ["PATIENT:READ", "PATIENT:UPDATE", "PRESCRIPTION:CREATE"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		roleBId = uuidv4();
		await Role.create({
			_id: roleBId,
			tenantId: hospitalBId,
			name: "CONSULTANT",
			description: "Consultant role at Hospital B",
			permissions: ["PATIENT:READ"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create staff records linking the same user to both hospitals
		staffAId = uuidv4();
		await Staff.create({
			_id: staffAId,
			tenantId: hospitalAId,
			userId: userId,
			employeeId: `EMP-A-${uniqueId}`,
			firstName: "Refresh",
			lastName: "Tenant",
			phone: "+1234567890",
			departmentId: departmentAId,
			roles: [roleAId],
			specialization: "General Medicine",
			shift: "MORNING",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		staffBId = uuidv4();
		await Staff.create({
			_id: staffBId,
			tenantId: hospitalBId,
			userId: userId,
			employeeId: `EMP-B-${uniqueId}`,
			firstName: "Refresh",
			lastName: "Tenant",
			phone: "+1234567890",
			departmentId: departmentBId,
			roles: [roleBId],
			specialization: "Consulting",
			shift: "EVENING",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Login to both hospitals to get refresh tokens
		const responseA = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalAId,
		});
		refreshTokenA = responseA.body.refresh_token;

		const responseB = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalBId,
		});
		refreshTokenB = responseB.body.refresh_token;
	}, 30000);

	afterAll(async () => {
		// Clean up sessions
		await Session.deleteMany({ userId });
		// Clean up in proper order
		await Staff.deleteMany({ userId });
		await Account.deleteOne({ userId });
		await User.deleteOne({ _id: userId });
		await Role.deleteMany({ _id: { $in: [roleAId, roleBId] } });
		await Department.deleteMany({
			_id: { $in: [departmentAId, departmentBId] },
		});
		await Hospital.deleteMany({ _id: { $in: [hospitalAId, hospitalBId] } });
	});

	it("should maintain Hospital A tenant context when refreshing token obtained from Hospital A login", async () => {
		// Refresh using Hospital A's refresh token
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "refresh_token",
			refresh_token: refreshTokenA,
		});

		expect(response.status).toBe(200);
		expect(response.body.access_token).toBeDefined();
		expect(response.body.refresh_token).toBeDefined();

		// Use the new access token to call /me endpoint
		const meResponse = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${response.body.access_token}`);

		expect(meResponse.status).toBe(200);
		// Verify tenant context is Hospital A
		expect(meResponse.body.data.tenantId).toBe(hospitalAId);
		// Verify roles are from Hospital A
		expect(
			meResponse.body.data.roles.some(
				(r: { name: string }) => r.name === "DOCTOR",
			),
		).toBe(true);
	}, 30000);

	it("should maintain Hospital B tenant context when refreshing token obtained from Hospital B login", async () => {
		// Refresh using Hospital B's refresh token
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "refresh_token",
			refresh_token: refreshTokenB,
		});

		expect(response.status).toBe(200);
		expect(response.body.access_token).toBeDefined();
		expect(response.body.refresh_token).toBeDefined();

		// Use the new access token to call /me endpoint
		const meResponse = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${response.body.access_token}`);

		expect(meResponse.status).toBe(200);
		// Verify tenant context is Hospital B
		expect(meResponse.body.data.tenantId).toBe(hospitalBId);
		// Verify roles are from Hospital B
		expect(
			meResponse.body.data.roles.some(
				(r: { name: string }) => r.name === "CONSULTANT",
			),
		).toBe(true);
	});

	it("should not cross-pollinate tenant contexts after multiple refreshes", async () => {
		// Login fresh to get new tokens for this test
		const freshLoginA = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalAId,
		});
		expect(freshLoginA.status).toBe(200);
		let currentRefreshTokenA = freshLoginA.body.refresh_token;

		const freshLoginB = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalBId,
		});
		expect(freshLoginB.status).toBe(200);
		let currentRefreshTokenB = freshLoginB.body.refresh_token;

		// Refresh 3 times for Hospital A
		for (let i = 0; i < 3; i++) {
			const response = await request(app).post("/api/auth/token").send({
				grant_type: "refresh_token",
				refresh_token: currentRefreshTokenA,
			});

			expect(response.status).toBe(200);
			currentRefreshTokenA = response.body.refresh_token;

			// Verify we're still in Hospital A context
			const meResponse = await request(app)
				.get("/api/auth/me")
				.set("Authorization", `Bearer ${response.body.access_token}`);

			expect(meResponse.status).toBe(200);
			expect(meResponse.body.data.tenantId).toBe(hospitalAId);
		}

		// Similarly for Hospital B
		for (let i = 0; i < 3; i++) {
			const response = await request(app).post("/api/auth/token").send({
				grant_type: "refresh_token",
				refresh_token: currentRefreshTokenB,
			});

			expect(response.status).toBe(200);
			currentRefreshTokenB = response.body.refresh_token;

			// Verify we're still in Hospital B context
			const meResponse = await request(app)
				.get("/api/auth/me")
				.set("Authorization", `Bearer ${response.body.access_token}`);

			expect(meResponse.status).toBe(200);
			expect(meResponse.body.data.tenantId).toBe(hospitalBId);
		}
	}, 60000);

	it("should store tenantId in the session record", async () => {
		// Login to get a fresh token
		const loginResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalAId,
		});

		expect(loginResponse.status).toBe(200);

		// Find the session in the database and verify tenantId is stored
		const session = await Session.findOne({
			token: loginResponse.body.access_token,
		}).lean();

		expect(session).toBeDefined();
		expect(session?.tenantId).toBe(hospitalAId);
	});
});

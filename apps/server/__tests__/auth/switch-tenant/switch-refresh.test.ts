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

describe("POST /api/auth/switch-tenant - Token refresh after switch", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const userEmail = `refresh-switch-${uniqueId}@test.com`;
	const password = "TestPassword123!";

	let userId: string;
	let hospitalAId: string;
	let hospitalBId: string;
	let roleAId: string;
	let roleBId: string;
	let departmentAId: string;
	let departmentBId: string;
	let accessTokenA: string;

	beforeAll(async () => {
		// Create user
		userId = uuidv4();
		const hashedPassword = await bcrypt.hash(password, 10);

		await User.create({
			_id: userId,
			name: "Refresh Switch User",
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
			name: `Hospital A Refresh ${uniqueId}`,
			slug: `hospital-a-refresh-${uniqueId}`,
			licenseNumber: `LIC-A-REF-${uniqueId}`,
			address: {
				street: "123 Hospital A St",
				city: "City A",
				state: "SA",
				postalCode: "11111",
				country: "USA",
			},
			contactEmail: `contact-a-ref-${uniqueId}@hospital.com`,
			contactPhone: "+1111111111",
			adminEmail: `admin-a-ref-${uniqueId}@hospital.com`,
			adminPhone: "+1111111112",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create Hospital B
		hospitalBId = uuidv4();
		await Hospital.create({
			_id: hospitalBId,
			name: `Hospital B Refresh ${uniqueId}`,
			slug: `hospital-b-refresh-${uniqueId}`,
			licenseNumber: `LIC-B-REF-${uniqueId}`,
			address: {
				street: "456 Hospital B St",
				city: "City B",
				state: "SB",
				postalCode: "22222",
				country: "USA",
			},
			contactEmail: `contact-b-ref-${uniqueId}@hospital.com`,
			contactPhone: "+2222222221",
			adminEmail: `admin-b-ref-${uniqueId}@hospital.com`,
			adminPhone: "+2222222222",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create departments
		departmentAId = uuidv4();
		await Department.create({
			_id: departmentAId,
			tenantId: hospitalAId,
			name: "Department A",
			code: `DEPT-A-REF-${uniqueId}`,
			description: "Department A",
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
			code: `DEPT-B-REF-${uniqueId}`,
			description: "Department B",
			type: "CLINICAL",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create roles with different permissions
		roleAId = uuidv4();
		await Role.create({
			_id: roleAId,
			tenantId: hospitalAId,
			name: "DOCTOR",
			description: "Doctor role",
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
			description: "Consultant role",
			permissions: ["PATIENT:READ", "REPORT:READ"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create staff for both hospitals
		await Staff.create({
			_id: uuidv4(),
			tenantId: hospitalAId,
			userId: userId,
			employeeId: `EMP-A-REF-${uniqueId}`,
			firstName: "Refresh",
			lastName: "Switch",
			phone: "+1234567890",
			departmentId: departmentAId,
			roles: [roleAId],
			shift: "MORNING",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await Staff.create({
			_id: uuidv4(),
			tenantId: hospitalBId,
			userId: userId,
			employeeId: `EMP-B-REF-${uniqueId}`,
			firstName: "Refresh",
			lastName: "Switch",
			phone: "+1234567890",
			departmentId: departmentBId,
			roles: [roleBId],
			shift: "EVENING",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Login to Hospital A
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalAId,
		});
		accessTokenA = response.body.access_token;
	}, 30000);

	afterAll(async () => {
		await Session.deleteMany({ userId });
		await Staff.deleteMany({ userId });
		await Account.deleteOne({ userId });
		await User.deleteOne({ _id: userId });
		await Role.deleteMany({ _id: { $in: [roleAId, roleBId] } });
		await Department.deleteMany({
			_id: { $in: [departmentAId, departmentBId] },
		});
		await Hospital.deleteMany({ _id: { $in: [hospitalAId, hospitalBId] } });
	});

	it("should allow refresh token from switch response to generate new access token", async () => {
		// Switch to Hospital B
		const switchResponse = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${accessTokenA}`)
			.send({ tenant_id: hospitalBId });

		expect(switchResponse.status).toBe(200);
		expect(switchResponse.body.refresh_token).toBeDefined();

		// Use the refresh token to get new access token
		const refreshResponse = await request(app).post("/api/auth/token").send({
			grant_type: "refresh_token",
			refresh_token: switchResponse.body.refresh_token,
		});

		expect(refreshResponse.status).toBe(200);
		expect(refreshResponse.body.access_token).toBeDefined();
		expect(refreshResponse.body.refresh_token).toBeDefined();

		// Verify the new access token works
		const meResponse = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${refreshResponse.body.access_token}`);

		expect(meResponse.status).toBe(200);
	});

	it("should maintain new tenant context when refreshing token after switch", async () => {
		// First login fresh to Hospital A
		const loginResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalAId,
		});

		// Switch to Hospital B
		const switchResponse = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${loginResponse.body.access_token}`)
			.send({ tenant_id: hospitalBId });

		expect(switchResponse.status).toBe(200);
		expect(switchResponse.body.tenant.id).toBe(hospitalBId);

		// Refresh the token
		const refreshResponse = await request(app).post("/api/auth/token").send({
			grant_type: "refresh_token",
			refresh_token: switchResponse.body.refresh_token,
		});

		expect(refreshResponse.status).toBe(200);

		// Verify tenant context is still Hospital B
		const meResponse = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${refreshResponse.body.access_token}`);

		expect(meResponse.status).toBe(200);
		expect(meResponse.body.data.tenantId).toBe(hospitalBId);
		expect(meResponse.body.data.hospital?.id).toBe(hospitalBId);
	});

	it("should return correct tenant permissions after refreshing switched token", async () => {
		// Login to Hospital A
		const loginResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalAId,
		});

		// Verify Hospital A permissions
		const meBeforeSwitch = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${loginResponse.body.access_token}`);

		expect(meBeforeSwitch.body.data.permissions).toContain(
			"PRESCRIPTION:CREATE",
		);
		expect(meBeforeSwitch.body.data.permissions).not.toContain("REPORT:READ");

		// Switch to Hospital B
		const switchResponse = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${loginResponse.body.access_token}`)
			.send({ tenant_id: hospitalBId });

		expect(switchResponse.status).toBe(200);

		// Refresh the token
		const refreshResponse = await request(app).post("/api/auth/token").send({
			grant_type: "refresh_token",
			refresh_token: switchResponse.body.refresh_token,
		});

		expect(refreshResponse.status).toBe(200);

		// Verify Hospital B permissions after refresh
		const meAfterRefresh = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${refreshResponse.body.access_token}`);

		expect(meAfterRefresh.status).toBe(200);
		expect(meAfterRefresh.body.data.tenantId).toBe(hospitalBId);

		// Should have Hospital B permissions (CONSULTANT role)
		expect(meAfterRefresh.body.data.permissions).toContain("PATIENT:READ");
		expect(meAfterRefresh.body.data.permissions).toContain("REPORT:READ");

		// Should NOT have Hospital A permissions (DOCTOR role)
		expect(meAfterRefresh.body.data.permissions).not.toContain(
			"PRESCRIPTION:CREATE",
		);
	});
});

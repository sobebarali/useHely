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

describe("POST /api/auth/switch-tenant - Switch tenant success", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const userEmail = `switch-tenant-${uniqueId}@test.com`;
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
	let accessTokenA: string;

	beforeAll(async () => {
		// Create a single user
		userId = uuidv4();
		const hashedPassword = await bcrypt.hash(password, 10);

		await User.create({
			_id: userId,
			name: "Switch Tenant User",
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
			firstName: "Switch",
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
			firstName: "Switch",
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

		// Login to Hospital A to get access token
		const responseA = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalAId,
		});
		accessTokenA = responseA.body.access_token;
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

	it("should switch from Hospital A to Hospital B successfully", async () => {
		// Verify we're currently in Hospital A
		const meBeforeSwitch = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${accessTokenA}`);

		expect(meBeforeSwitch.status).toBe(200);
		expect(meBeforeSwitch.body.data.tenantId).toBe(hospitalAId);

		// Switch to Hospital B
		const switchResponse = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${accessTokenA}`)
			.send({ tenant_id: hospitalBId });

		expect(switchResponse.status).toBe(200);
		expect(switchResponse.body.access_token).toBeDefined();
		expect(switchResponse.body.refresh_token).toBeDefined();
		expect(switchResponse.body.token_type).toBe("Bearer");
		expect(switchResponse.body.tenant.id).toBe(hospitalBId);
		expect(switchResponse.body.tenant.name).toContain("Hospital B");

		// Verify new token gives Hospital B context
		const meAfterSwitch = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${switchResponse.body.access_token}`);

		expect(meAfterSwitch.status).toBe(200);
		expect(meAfterSwitch.body.data.tenantId).toBe(hospitalBId);
		expect(
			meAfterSwitch.body.data.roles.some(
				(r: { name: string }) => r.name === "CONSULTANT",
			),
		).toBe(true);
	}, 30000);

	it("should revoke old token after switching tenant", async () => {
		// Login fresh to Hospital A
		const loginResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalAId,
		});

		const oldToken = loginResponse.body.access_token;

		// Verify old token works
		const meBeforeSwitch = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${oldToken}`);
		expect(meBeforeSwitch.status).toBe(200);

		// Switch to Hospital B
		const switchResponse = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${oldToken}`)
			.send({ tenant_id: hospitalBId });

		expect(switchResponse.status).toBe(200);

		// Verify old token no longer works
		const meWithOldToken = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${oldToken}`);

		expect(meWithOldToken.status).toBe(401);
	});

	it("should issue tokens with correct tenant context", async () => {
		// Login to Hospital A
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

		// Verify the session stored in DB has correct tenantId
		const session = await Session.findOne({
			token: switchResponse.body.access_token,
		}).lean();

		expect(session).toBeDefined();
		expect(session?.tenantId).toBe(hospitalBId);
	});

	it("should allow switching back to original tenant", async () => {
		// Login to Hospital A
		const loginResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalAId,
		});

		// Switch to Hospital B
		const switchToB = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${loginResponse.body.access_token}`)
			.send({ tenant_id: hospitalBId });

		expect(switchToB.status).toBe(200);
		expect(switchToB.body.tenant.id).toBe(hospitalBId);

		// Switch back to Hospital A
		const switchBackToA = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${switchToB.body.access_token}`)
			.send({ tenant_id: hospitalAId });

		expect(switchBackToA.status).toBe(200);
		expect(switchBackToA.body.tenant.id).toBe(hospitalAId);

		// Verify we're back in Hospital A context
		const meResponse = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${switchBackToA.body.access_token}`);

		expect(meResponse.status).toBe(200);
		expect(meResponse.body.data.tenantId).toBe(hospitalAId);
		expect(
			meResponse.body.data.roles.some(
				(r: { name: string }) => r.name === "DOCTOR",
			),
		).toBe(true);
	}, 30000);
});

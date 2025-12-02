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

describe("GET /api/auth/tenants - List user tenants success", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const userEmail = `list-tenants-${uniqueId}@test.com`;
	const password = "TestPassword123!";

	let userId: string;
	let hospitalAId: string;
	let hospitalBId: string;
	let hospitalCId: string;
	let roleAId: string;
	let roleBId: string;
	let roleCId: string;
	let departmentAId: string;
	let departmentBId: string;
	let staffAId: string;
	let staffBId: string;
	let staffCId: string;
	let accessTokenA: string;

	beforeAll(async () => {
		// Create a single user
		userId = uuidv4();
		const hashedPassword = await bcrypt.hash(password, 10);

		await User.create({
			_id: userId,
			name: "List Tenants User",
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

		// Create Hospital A (ACTIVE)
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

		// Create Hospital B (ACTIVE)
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

		// Create Hospital C (SUSPENDED - to test inactive tenant display)
		hospitalCId = uuidv4();
		await Hospital.create({
			_id: hospitalCId,
			name: `Hospital C ${uniqueId}`,
			slug: `hospital-c-${uniqueId}`,
			licenseNumber: `LIC-C-${uniqueId}`,
			address: {
				street: "789 Hospital C St",
				city: "City C",
				state: "SC",
				postalCode: "33333",
				country: "USA",
			},
			contactEmail: `contact-c-${uniqueId}@hospital.com`,
			contactPhone: "+3333333331",
			adminEmail: `admin-c-${uniqueId}@hospital.com`,
			adminPhone: "+3333333332",
			status: "SUSPENDED",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create departments for hospitals A and B
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

		// Create roles for each hospital
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

		roleCId = uuidv4();
		await Role.create({
			_id: roleCId,
			tenantId: hospitalCId,
			name: "NURSE",
			description: "Nurse role at Hospital C",
			permissions: ["PATIENT:READ"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create staff records linking the same user to all three hospitals
		staffAId = uuidv4();
		await Staff.create({
			_id: staffAId,
			tenantId: hospitalAId,
			userId: userId,
			employeeId: `EMP-A-${uniqueId}`,
			firstName: "List",
			lastName: "Tenants",
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
			firstName: "List",
			lastName: "Tenants",
			phone: "+1234567890",
			departmentId: departmentBId,
			roles: [roleBId],
			specialization: "Consulting",
			shift: "EVENING",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		staffCId = uuidv4();
		await Staff.create({
			_id: staffCId,
			tenantId: hospitalCId,
			userId: userId,
			employeeId: `EMP-C-${uniqueId}`,
			firstName: "List",
			lastName: "Tenants",
			phone: "+1234567890",
			roles: [roleCId],
			shift: "NIGHT",
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
		await Role.deleteMany({ _id: { $in: [roleAId, roleBId, roleCId] } });
		await Department.deleteMany({
			_id: { $in: [departmentAId, departmentBId] },
		});
		await Hospital.deleteMany({
			_id: { $in: [hospitalAId, hospitalBId, hospitalCId] },
		});
	});

	it("should return all tenants for a multi-tenant user", async () => {
		const response = await request(app)
			.get("/api/auth/tenants")
			.set("Authorization", `Bearer ${accessTokenA}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.tenants).toBeDefined();
		expect(Array.isArray(response.body.data.tenants)).toBe(true);
		expect(response.body.data.tenants.length).toBe(3);
		expect(response.body.data.currentTenantId).toBe(hospitalAId);
	});

	it("should mark the current tenant correctly", async () => {
		const response = await request(app)
			.get("/api/auth/tenants")
			.set("Authorization", `Bearer ${accessTokenA}`);

		expect(response.status).toBe(200);

		const tenants = response.body.data.tenants;
		const currentTenant = tenants.find(
			(t: { id: string }) => t.id === hospitalAId,
		);
		const otherTenants = tenants.filter(
			(t: { id: string }) => t.id !== hospitalAId,
		);

		expect(currentTenant).toBeDefined();
		expect(currentTenant.isCurrent).toBe(true);

		for (const tenant of otherTenants) {
			expect(tenant.isCurrent).toBe(false);
		}
	});

	it("should include tenant details with roles", async () => {
		const response = await request(app)
			.get("/api/auth/tenants")
			.set("Authorization", `Bearer ${accessTokenA}`);

		expect(response.status).toBe(200);

		const hospitalATenant = response.body.data.tenants.find(
			(t: { id: string }) => t.id === hospitalAId,
		);

		expect(hospitalATenant).toBeDefined();
		expect(hospitalATenant.name).toContain("Hospital A");
		expect(hospitalATenant.status).toBe("ACTIVE");
		expect(hospitalATenant.staffStatus).toBe("ACTIVE");
		expect(hospitalATenant.roles).toBeDefined();
		expect(Array.isArray(hospitalATenant.roles)).toBe(true);
		expect(hospitalATenant.roles.length).toBeGreaterThan(0);
		expect(
			hospitalATenant.roles.some((r: { name: string }) => r.name === "DOCTOR"),
		).toBe(true);
	});

	it("should include inactive/suspended tenants with correct status", async () => {
		const response = await request(app)
			.get("/api/auth/tenants")
			.set("Authorization", `Bearer ${accessTokenA}`);

		expect(response.status).toBe(200);

		const hospitalCTenant = response.body.data.tenants.find(
			(t: { id: string }) => t.id === hospitalCId,
		);

		expect(hospitalCTenant).toBeDefined();
		expect(hospitalCTenant.name).toContain("Hospital C");
		expect(hospitalCTenant.status).toBe("SUSPENDED");
		expect(hospitalCTenant.isCurrent).toBe(false);
	});

	it("should return different current tenant after switching", async () => {
		// Switch to Hospital B
		const switchResponse = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${accessTokenA}`)
			.send({ tenant_id: hospitalBId });

		expect(switchResponse.status).toBe(200);
		const newToken = switchResponse.body.access_token;

		// Get tenants with new token
		const response = await request(app)
			.get("/api/auth/tenants")
			.set("Authorization", `Bearer ${newToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.currentTenantId).toBe(hospitalBId);

		const hospitalBTenant = response.body.data.tenants.find(
			(t: { id: string }) => t.id === hospitalBId,
		);
		expect(hospitalBTenant.isCurrent).toBe(true);

		const hospitalATenant = response.body.data.tenants.find(
			(t: { id: string }) => t.id === hospitalAId,
		);
		expect(hospitalATenant.isCurrent).toBe(false);
	}, 30000);
});

describe("GET /api/auth/tenants - Single tenant user", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const userEmail = `single-tenant-${uniqueId}@test.com`;
	const password = "TestPassword123!";

	let userId: string;
	let hospitalId: string;
	let roleId: string;
	let departmentId: string;
	let staffId: string;
	let accessToken: string;

	beforeAll(async () => {
		// Create a single user
		userId = uuidv4();
		const hashedPassword = await bcrypt.hash(password, 10);

		await User.create({
			_id: userId,
			name: "Single Tenant User",
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

		// Create only one Hospital
		hospitalId = uuidv4();
		await Hospital.create({
			_id: hospitalId,
			name: `Single Hospital ${uniqueId}`,
			slug: `single-hospital-${uniqueId}`,
			licenseNumber: `LIC-S-${uniqueId}`,
			address: {
				street: "123 Single St",
				city: "Single City",
				state: "SS",
				postalCode: "44444",
				country: "USA",
			},
			contactEmail: `contact-single-${uniqueId}@hospital.com`,
			contactPhone: "+4444444441",
			adminEmail: `admin-single-${uniqueId}@hospital.com`,
			adminPhone: "+4444444442",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create department
		departmentId = uuidv4();
		await Department.create({
			_id: departmentId,
			tenantId: hospitalId,
			name: "Single Department",
			code: `DEPT-S-${uniqueId}`,
			description: "Department at Single Hospital",
			type: "CLINICAL",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create role
		roleId = uuidv4();
		await Role.create({
			_id: roleId,
			tenantId: hospitalId,
			name: "ADMIN",
			description: "Admin role at Single Hospital",
			permissions: ["PATIENT:READ", "PATIENT:CREATE", "PATIENT:UPDATE"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create staff record
		staffId = uuidv4();
		await Staff.create({
			_id: staffId,
			tenantId: hospitalId,
			userId: userId,
			employeeId: `EMP-S-${uniqueId}`,
			firstName: "Single",
			lastName: "User",
			phone: "+1234567890",
			departmentId: departmentId,
			roles: [roleId],
			shift: "MORNING",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Login
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalId,
		});
		accessToken = response.body.access_token;
	}, 30000);

	afterAll(async () => {
		await Session.deleteMany({ userId });
		await Staff.deleteMany({ userId });
		await Account.deleteOne({ userId });
		await User.deleteOne({ _id: userId });
		await Role.deleteMany({ _id: roleId });
		await Department.deleteMany({ _id: departmentId });
		await Hospital.deleteMany({ _id: hospitalId });
	});

	it("should return single tenant for single-tenant user", async () => {
		const response = await request(app)
			.get("/api/auth/tenants")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.tenants.length).toBe(1);
		expect(response.body.data.tenants[0].id).toBe(hospitalId);
		expect(response.body.data.tenants[0].isCurrent).toBe(true);
		expect(response.body.data.currentTenantId).toBe(hospitalId);
	});
});

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

describe("GET /api/auth/tenants - User with staff in inactive hospital only", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const userEmail = `inactive-only-${uniqueId}@test.com`;
	const password = "TestPassword123!";

	let userId: string;
	let activeHospitalId: string;
	let inactiveHospitalId: string;
	let roleActiveId: string;
	let roleInactiveId: string;
	let departmentActiveId: string;
	let staffActiveId: string;
	let staffInactiveId: string;
	let accessToken: string;

	beforeAll(async () => {
		// Create user
		userId = uuidv4();
		const hashedPassword = await bcrypt.hash(password, 10);

		await User.create({
			_id: userId,
			name: "Inactive Only User",
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

		// Create active hospital for login
		activeHospitalId = uuidv4();
		await Hospital.create({
			_id: activeHospitalId,
			name: `Active Hospital ${uniqueId}`,
			slug: `active-hospital-${uniqueId}`,
			licenseNumber: `LIC-ACTIVE-${uniqueId}`,
			address: {
				street: "123 Active St",
				city: "Active City",
				state: "AS",
				postalCode: "11111",
				country: "USA",
			},
			contactEmail: `contact-active-${uniqueId}@hospital.com`,
			contactPhone: "+1111111111",
			adminEmail: `admin-active-${uniqueId}@hospital.com`,
			adminPhone: "+1111111112",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create inactive hospital
		inactiveHospitalId = uuidv4();
		await Hospital.create({
			_id: inactiveHospitalId,
			name: `Inactive Hospital ${uniqueId}`,
			slug: `inactive-hospital-${uniqueId}`,
			licenseNumber: `LIC-INACTIVE-${uniqueId}`,
			address: {
				street: "456 Inactive St",
				city: "Inactive City",
				state: "IS",
				postalCode: "22222",
				country: "USA",
			},
			contactEmail: `contact-inactive-${uniqueId}@hospital.com`,
			contactPhone: "+2222222222",
			adminEmail: `admin-inactive-${uniqueId}@hospital.com`,
			adminPhone: "+2222222223",
			status: "INACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create department for active hospital
		departmentActiveId = uuidv4();
		await Department.create({
			_id: departmentActiveId,
			tenantId: activeHospitalId,
			name: "Active Department",
			code: `DEPT-ACTIVE-${uniqueId}`,
			description: "Active department",
			type: "CLINICAL",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create roles
		roleActiveId = uuidv4();
		await Role.create({
			_id: roleActiveId,
			tenantId: activeHospitalId,
			name: "ACTIVE_ROLE",
			description: "Active role",
			permissions: ["PATIENT:READ"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		roleInactiveId = uuidv4();
		await Role.create({
			_id: roleInactiveId,
			tenantId: inactiveHospitalId,
			name: "INACTIVE_ROLE",
			description: "Inactive role",
			permissions: ["PATIENT:READ"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create staff in active hospital
		staffActiveId = uuidv4();
		await Staff.create({
			_id: staffActiveId,
			tenantId: activeHospitalId,
			userId: userId,
			employeeId: `EMP-ACTIVE-${uniqueId}`,
			firstName: "Inactive",
			lastName: "Only",
			phone: "+1234567890",
			departmentId: departmentActiveId,
			roles: [roleActiveId],
			shift: "MORNING",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create staff in inactive hospital
		staffInactiveId = uuidv4();
		await Staff.create({
			_id: staffInactiveId,
			tenantId: inactiveHospitalId,
			userId: userId,
			employeeId: `EMP-INACTIVE-${uniqueId}`,
			firstName: "Inactive",
			lastName: "Only",
			phone: "+1234567891",
			roles: [roleInactiveId],
			shift: "MORNING",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Login to active hospital to get token
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: activeHospitalId,
		});
		accessToken = response.body.access_token;
	}, 30000);

	afterAll(async () => {
		await Session.deleteMany({ userId });
		await Staff.deleteMany({ userId });
		await Account.deleteOne({ userId });
		await User.deleteOne({ _id: userId });
		await Role.deleteMany({ _id: { $in: [roleActiveId, roleInactiveId] } });
		await Department.deleteOne({ _id: departmentActiveId });
		await Hospital.deleteMany({
			_id: { $in: [activeHospitalId, inactiveHospitalId] },
		});
	});

	it("should return tenants including those with inactive hospital status", async () => {
		// The tenants endpoint returns all staff records regardless of hospital status
		// It's the client's responsibility to filter based on status
		const response = await request(app)
			.get("/api/auth/tenants")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.tenants).toBeDefined();
		expect(Array.isArray(response.body.data.tenants)).toBe(true);

		// Should have both tenants listed
		expect(response.body.data.tenants.length).toBe(2);

		// Find the inactive hospital tenant
		const inactiveTenant = response.body.data.tenants.find(
			(t: { id: string }) => t.id === inactiveHospitalId,
		);
		expect(inactiveTenant).toBeDefined();
		expect(inactiveTenant.status).toBe("INACTIVE");

		// Find the active hospital tenant
		const activeTenant = response.body.data.tenants.find(
			(t: { id: string }) => t.id === activeHospitalId,
		);
		expect(activeTenant).toBeDefined();
		expect(activeTenant.status).toBe("ACTIVE");
	});
});

describe("GET /api/auth/tenants - Staff with multiple roles", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const userEmail = `multi-role-${uniqueId}@test.com`;
	const password = "TestPassword123!";

	let userId: string;
	let hospitalId: string;
	let roleId1: string;
	let roleId2: string;
	let roleId3: string;
	let departmentId: string;
	let staffId: string;
	let accessToken: string;

	beforeAll(async () => {
		// Create user
		userId = uuidv4();
		const hashedPassword = await bcrypt.hash(password, 10);

		await User.create({
			_id: userId,
			name: "Multi Role User",
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

		// Create hospital
		hospitalId = uuidv4();
		await Hospital.create({
			_id: hospitalId,
			name: `Multi Role Hospital ${uniqueId}`,
			slug: `multi-role-hospital-${uniqueId}`,
			licenseNumber: `LIC-MR-${uniqueId}`,
			address: {
				street: "123 Multi Role St",
				city: "Role City",
				state: "RC",
				postalCode: "22222",
				country: "USA",
			},
			contactEmail: `contact-mr-${uniqueId}@hospital.com`,
			contactPhone: "+2222222221",
			adminEmail: `admin-mr-${uniqueId}@hospital.com`,
			adminPhone: "+2222222222",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create department
		departmentId = uuidv4();
		await Department.create({
			_id: departmentId,
			tenantId: hospitalId,
			name: "Multi Role Department",
			code: `DEPT-MR-${uniqueId}`,
			description: "Multi role department",
			type: "CLINICAL",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create 3 roles
		roleId1 = uuidv4();
		await Role.create({
			_id: roleId1,
			tenantId: hospitalId,
			name: "DOCTOR",
			description: "Doctor role",
			permissions: ["PATIENT:READ", "PATIENT:UPDATE"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		roleId2 = uuidv4();
		await Role.create({
			_id: roleId2,
			tenantId: hospitalId,
			name: "ADMIN",
			description: "Admin role",
			permissions: ["USER:READ", "USER:CREATE"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		roleId3 = uuidv4();
		await Role.create({
			_id: roleId3,
			tenantId: hospitalId,
			name: "MANAGER",
			description: "Manager role",
			permissions: ["REPORT:READ"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create staff with multiple roles
		staffId = uuidv4();
		await Staff.create({
			_id: staffId,
			tenantId: hospitalId,
			userId: userId,
			employeeId: `EMP-MR-${uniqueId}`,
			firstName: "Multi",
			lastName: "Role",
			phone: "+1234567890",
			departmentId: departmentId,
			roles: [roleId1, roleId2, roleId3],
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
		await Role.deleteMany({ _id: { $in: [roleId1, roleId2, roleId3] } });
		await Department.deleteOne({ _id: departmentId });
		await Hospital.deleteOne({ _id: hospitalId });
	});

	it("should return all roles for staff with multiple roles in same tenant", async () => {
		const response = await request(app)
			.get("/api/auth/tenants")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.tenants.length).toBe(1);

		const tenant = response.body.data.tenants[0];
		expect(tenant.roles).toBeDefined();
		expect(Array.isArray(tenant.roles)).toBe(true);
		expect(tenant.roles.length).toBe(3);

		const roleNames = tenant.roles.map((r: { name: string }) => r.name);
		expect(roleNames).toContain("DOCTOR");
		expect(roleNames).toContain("ADMIN");
		expect(roleNames).toContain("MANAGER");
	});
});

describe("GET /api/auth/tenants - Various staff statuses", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const userEmail = `staff-status-${uniqueId}@test.com`;
	const password = "TestPassword123!";

	let userId: string;
	let hospitalAId: string;
	let hospitalBId: string;
	let hospitalCId: string;
	let roleAId: string;
	let roleBId: string;
	let roleCId: string;
	let departmentAId: string;
	let staffAId: string;
	let staffBId: string;
	let staffCId: string;
	let accessToken: string;

	beforeAll(async () => {
		// Create user
		userId = uuidv4();
		const hashedPassword = await bcrypt.hash(password, 10);

		await User.create({
			_id: userId,
			name: "Staff Status User",
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

		// Create Hospital A (user will login here with ACTIVE staff)
		hospitalAId = uuidv4();
		await Hospital.create({
			_id: hospitalAId,
			name: `Hospital A Status ${uniqueId}`,
			slug: `hospital-a-status-${uniqueId}`,
			licenseNumber: `LIC-A-ST-${uniqueId}`,
			address: {
				street: "123 Hospital A St",
				city: "City A",
				state: "SA",
				postalCode: "11111",
				country: "USA",
			},
			contactEmail: `contact-a-st-${uniqueId}@hospital.com`,
			contactPhone: "+1111111111",
			adminEmail: `admin-a-st-${uniqueId}@hospital.com`,
			adminPhone: "+1111111112",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create Hospital B (user has INACTIVE staff here)
		hospitalBId = uuidv4();
		await Hospital.create({
			_id: hospitalBId,
			name: `Hospital B Status ${uniqueId}`,
			slug: `hospital-b-status-${uniqueId}`,
			licenseNumber: `LIC-B-ST-${uniqueId}`,
			address: {
				street: "456 Hospital B St",
				city: "City B",
				state: "SB",
				postalCode: "22222",
				country: "USA",
			},
			contactEmail: `contact-b-st-${uniqueId}@hospital.com`,
			contactPhone: "+2222222221",
			adminEmail: `admin-b-st-${uniqueId}@hospital.com`,
			adminPhone: "+2222222222",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create Hospital C (user has LOCKED staff here)
		hospitalCId = uuidv4();
		await Hospital.create({
			_id: hospitalCId,
			name: `Hospital C Status ${uniqueId}`,
			slug: `hospital-c-status-${uniqueId}`,
			licenseNumber: `LIC-C-ST-${uniqueId}`,
			address: {
				street: "789 Hospital C St",
				city: "City C",
				state: "SC",
				postalCode: "33333",
				country: "USA",
			},
			contactEmail: `contact-c-st-${uniqueId}@hospital.com`,
			contactPhone: "+3333333331",
			adminEmail: `admin-c-st-${uniqueId}@hospital.com`,
			adminPhone: "+3333333332",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create department for Hospital A
		departmentAId = uuidv4();
		await Department.create({
			_id: departmentAId,
			tenantId: hospitalAId,
			name: "Department A",
			code: `DEPT-A-ST-${uniqueId}`,
			description: "Department A",
			type: "CLINICAL",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create roles
		roleAId = uuidv4();
		await Role.create({
			_id: roleAId,
			tenantId: hospitalAId,
			name: "DOCTOR",
			description: "Doctor role",
			permissions: ["PATIENT:READ"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		roleBId = uuidv4();
		await Role.create({
			_id: roleBId,
			tenantId: hospitalBId,
			name: "NURSE",
			description: "Nurse role",
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
			name: "ADMIN",
			description: "Admin role",
			permissions: ["USER:READ"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Staff A - ACTIVE
		staffAId = uuidv4();
		await Staff.create({
			_id: staffAId,
			tenantId: hospitalAId,
			userId: userId,
			employeeId: `EMP-A-ST-${uniqueId}`,
			firstName: "Staff",
			lastName: "Status",
			phone: "+1234567890",
			departmentId: departmentAId,
			roles: [roleAId],
			shift: "MORNING",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Staff B - INACTIVE
		staffBId = uuidv4();
		await Staff.create({
			_id: staffBId,
			tenantId: hospitalBId,
			userId: userId,
			employeeId: `EMP-B-ST-${uniqueId}`,
			firstName: "Staff",
			lastName: "Status",
			phone: "+1234567890",
			roles: [roleBId],
			shift: "EVENING",
			status: "INACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Staff C - LOCKED
		staffCId = uuidv4();
		await Staff.create({
			_id: staffCId,
			tenantId: hospitalCId,
			userId: userId,
			employeeId: `EMP-C-ST-${uniqueId}`,
			firstName: "Staff",
			lastName: "Status",
			phone: "+1234567890",
			roles: [roleCId],
			shift: "NIGHT",
			status: "LOCKED",
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
		accessToken = response.body.access_token;
	}, 30000);

	afterAll(async () => {
		await Session.deleteMany({ userId });
		await Staff.deleteMany({ userId });
		await Account.deleteOne({ userId });
		await User.deleteOne({ _id: userId });
		await Role.deleteMany({ _id: { $in: [roleAId, roleBId, roleCId] } });
		await Department.deleteOne({ _id: departmentAId });
		await Hospital.deleteMany({
			_id: { $in: [hospitalAId, hospitalBId, hospitalCId] },
		});
	});

	it("should include staff with INACTIVE status showing staffStatus correctly", async () => {
		const response = await request(app)
			.get("/api/auth/tenants")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.tenants.length).toBe(3);

		const hospitalBTenant = response.body.data.tenants.find(
			(t: { id: string }) => t.id === hospitalBId,
		);
		expect(hospitalBTenant).toBeDefined();
		expect(hospitalBTenant.staffStatus).toBe("INACTIVE");
		expect(hospitalBTenant.status).toBe("ACTIVE"); // Hospital is active
	});

	it("should include staff with LOCKED status showing staffStatus correctly", async () => {
		const response = await request(app)
			.get("/api/auth/tenants")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const hospitalCTenant = response.body.data.tenants.find(
			(t: { id: string }) => t.id === hospitalCId,
		);
		expect(hospitalCTenant).toBeDefined();
		expect(hospitalCTenant.staffStatus).toBe("LOCKED");
		expect(hospitalCTenant.status).toBe("ACTIVE"); // Hospital is active
	});

	it("should show ACTIVE staffStatus for active staff", async () => {
		const response = await request(app)
			.get("/api/auth/tenants")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const hospitalATenant = response.body.data.tenants.find(
			(t: { id: string }) => t.id === hospitalAId,
		);
		expect(hospitalATenant).toBeDefined();
		expect(hospitalATenant.staffStatus).toBe("ACTIVE");
		expect(hospitalATenant.isCurrent).toBe(true);
	});
});

describe("GET /api/auth/tenants - Sorting behavior", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const userEmail = `sort-test-${uniqueId}@test.com`;
	const password = "TestPassword123!";

	let userId: string;
	let hospitalAId: string;
	let hospitalBId: string;
	let hospitalCId: string;
	let roleAId: string;
	let roleBId: string;
	let roleCId: string;
	let departmentBId: string;
	let accessToken: string;

	beforeAll(async () => {
		// Create user
		userId = uuidv4();
		const hashedPassword = await bcrypt.hash(password, 10);

		await User.create({
			_id: userId,
			name: "Sort Test User",
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

		// Create hospitals with names that would sort: Alpha, Beta, Zeta
		// User will login to Beta (middle alphabetically)
		hospitalAId = uuidv4();
		await Hospital.create({
			_id: hospitalAId,
			name: `Alpha Hospital ${uniqueId}`,
			slug: `alpha-hospital-${uniqueId}`,
			licenseNumber: `LIC-ALPHA-${uniqueId}`,
			address: {
				street: "123 Alpha St",
				city: "Alpha City",
				state: "AL",
				postalCode: "11111",
				country: "USA",
			},
			contactEmail: `contact-alpha-${uniqueId}@hospital.com`,
			contactPhone: "+1111111111",
			adminEmail: `admin-alpha-${uniqueId}@hospital.com`,
			adminPhone: "+1111111112",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		hospitalBId = uuidv4();
		await Hospital.create({
			_id: hospitalBId,
			name: `Beta Hospital ${uniqueId}`,
			slug: `beta-hospital-${uniqueId}`,
			licenseNumber: `LIC-BETA-${uniqueId}`,
			address: {
				street: "456 Beta St",
				city: "Beta City",
				state: "BE",
				postalCode: "22222",
				country: "USA",
			},
			contactEmail: `contact-beta-${uniqueId}@hospital.com`,
			contactPhone: "+2222222221",
			adminEmail: `admin-beta-${uniqueId}@hospital.com`,
			adminPhone: "+2222222222",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		hospitalCId = uuidv4();
		await Hospital.create({
			_id: hospitalCId,
			name: `Zeta Hospital ${uniqueId}`,
			slug: `zeta-hospital-${uniqueId}`,
			licenseNumber: `LIC-ZETA-${uniqueId}`,
			address: {
				street: "789 Zeta St",
				city: "Zeta City",
				state: "ZE",
				postalCode: "33333",
				country: "USA",
			},
			contactEmail: `contact-zeta-${uniqueId}@hospital.com`,
			contactPhone: "+3333333331",
			adminEmail: `admin-zeta-${uniqueId}@hospital.com`,
			adminPhone: "+3333333332",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create department for Beta hospital (for login)
		departmentBId = uuidv4();
		await Department.create({
			_id: departmentBId,
			tenantId: hospitalBId,
			name: "Beta Department",
			code: `DEPT-BETA-${uniqueId}`,
			description: "Beta department",
			type: "CLINICAL",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create roles
		roleAId = uuidv4();
		await Role.create({
			_id: roleAId,
			tenantId: hospitalAId,
			name: "DOCTOR",
			permissions: ["PATIENT:READ"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		roleBId = uuidv4();
		await Role.create({
			_id: roleBId,
			tenantId: hospitalBId,
			name: "NURSE",
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
			name: "ADMIN",
			permissions: ["USER:READ"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create staff for all three hospitals
		await Staff.create({
			_id: uuidv4(),
			tenantId: hospitalAId,
			userId: userId,
			employeeId: `EMP-ALPHA-${uniqueId}`,
			firstName: "Sort",
			lastName: "Test",
			phone: "+1234567890",
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
			employeeId: `EMP-BETA-${uniqueId}`,
			firstName: "Sort",
			lastName: "Test",
			phone: "+1234567890",
			departmentId: departmentBId,
			roles: [roleBId],
			shift: "EVENING",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await Staff.create({
			_id: uuidv4(),
			tenantId: hospitalCId,
			userId: userId,
			employeeId: `EMP-ZETA-${uniqueId}`,
			firstName: "Sort",
			lastName: "Test",
			phone: "+1234567890",
			roles: [roleCId],
			shift: "NIGHT",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Login to Beta Hospital (middle alphabetically)
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalBId,
		});
		accessToken = response.body.access_token;
	}, 30000);

	afterAll(async () => {
		await Session.deleteMany({ userId });
		await Staff.deleteMany({ userId });
		await Account.deleteOne({ userId });
		await User.deleteOne({ _id: userId });
		await Role.deleteMany({ _id: { $in: [roleAId, roleBId, roleCId] } });
		await Department.deleteOne({ _id: departmentBId });
		await Hospital.deleteMany({
			_id: { $in: [hospitalAId, hospitalBId, hospitalCId] },
		});
	});

	it("should sort current tenant first, then alphabetically by name", async () => {
		const response = await request(app)
			.get("/api/auth/tenants")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.tenants.length).toBe(3);

		const tenants = response.body.data.tenants;

		// First should be Beta (current)
		expect(tenants[0].id).toBe(hospitalBId);
		expect(tenants[0].isCurrent).toBe(true);
		expect(tenants[0].name).toContain("Beta");

		// Second should be Alpha (alphabetically first among non-current)
		expect(tenants[1].id).toBe(hospitalAId);
		expect(tenants[1].isCurrent).toBe(false);
		expect(tenants[1].name).toContain("Alpha");

		// Third should be Zeta (alphabetically last)
		expect(tenants[2].id).toBe(hospitalCId);
		expect(tenants[2].isCurrent).toBe(false);
		expect(tenants[2].name).toContain("Zeta");
	});
});

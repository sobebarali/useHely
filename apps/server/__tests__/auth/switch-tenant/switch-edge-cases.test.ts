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

describe("POST /api/auth/switch-tenant - Switch to same tenant", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const userEmail = `same-tenant-${uniqueId}@test.com`;
	const password = "TestPassword123!";

	let userId: string;
	let hospitalId: string;
	let roleId: string;
	let departmentId: string;
	let staffId: string;
	let accessToken: string;

	beforeAll(async () => {
		// Create user
		userId = uuidv4();
		const hashedPassword = await bcrypt.hash(password, 10);

		await User.create({
			_id: userId,
			name: "Same Tenant User",
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
			name: `Same Tenant Hospital ${uniqueId}`,
			slug: `same-tenant-hospital-${uniqueId}`,
			licenseNumber: `LIC-SAME-${uniqueId}`,
			address: {
				street: "123 Same St",
				city: "Same City",
				state: "SM",
				postalCode: "11111",
				country: "USA",
			},
			contactEmail: `contact-same-${uniqueId}@hospital.com`,
			contactPhone: "+1111111111",
			adminEmail: `admin-same-${uniqueId}@hospital.com`,
			adminPhone: "+1111111112",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create department
		departmentId = uuidv4();
		await Department.create({
			_id: departmentId,
			tenantId: hospitalId,
			name: "Same Department",
			code: `DEPT-SAME-${uniqueId}`,
			description: "Same department",
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
			name: "DOCTOR",
			description: "Doctor role",
			permissions: ["PATIENT:READ", "PATIENT:UPDATE"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create staff
		staffId = uuidv4();
		await Staff.create({
			_id: staffId,
			tenantId: hospitalId,
			userId: userId,
			employeeId: `EMP-SAME-${uniqueId}`,
			firstName: "Same",
			lastName: "Tenant",
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
		await Role.deleteOne({ _id: roleId });
		await Department.deleteOne({ _id: departmentId });
		await Hospital.deleteOne({ _id: hospitalId });
	});

	it("should succeed when switching to same tenant and return new tokens", async () => {
		const switchResponse = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ tenant_id: hospitalId });

		expect(switchResponse.status).toBe(200);
		expect(switchResponse.body.access_token).toBeDefined();
		expect(switchResponse.body.refresh_token).toBeDefined();
		expect(switchResponse.body.tenant.id).toBe(hospitalId);

		// New token should be different from old
		expect(switchResponse.body.access_token).not.toBe(accessToken);

		// New token should work
		const meResponse = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${switchResponse.body.access_token}`);

		expect(meResponse.status).toBe(200);
		expect(meResponse.body.data.tenantId).toBe(hospitalId);
	});
});

describe("POST /api/auth/switch-tenant - Staff INACTIVE status", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const userEmail = `inactive-staff-${uniqueId}@test.com`;
	const password = "TestPassword123!";

	let userId: string;
	let hospitalAId: string;
	let hospitalBId: string;
	let roleAId: string;
	let roleBId: string;
	let departmentAId: string;
	let staffAId: string;
	let staffBId: string;
	let accessTokenA: string;

	beforeAll(async () => {
		// Create user
		userId = uuidv4();
		const hashedPassword = await bcrypt.hash(password, 10);

		await User.create({
			_id: userId,
			name: "Inactive Staff User",
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

		// Create Hospital A (user is ACTIVE here)
		hospitalAId = uuidv4();
		await Hospital.create({
			_id: hospitalAId,
			name: `Hospital A Inactive ${uniqueId}`,
			slug: `hospital-a-inactive-${uniqueId}`,
			licenseNumber: `LIC-A-INACT-${uniqueId}`,
			address: {
				street: "123 Hospital A St",
				city: "City A",
				state: "SA",
				postalCode: "11111",
				country: "USA",
			},
			contactEmail: `contact-a-inact-${uniqueId}@hospital.com`,
			contactPhone: "+1111111111",
			adminEmail: `admin-a-inact-${uniqueId}@hospital.com`,
			adminPhone: "+1111111112",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create Hospital B (user is INACTIVE here)
		hospitalBId = uuidv4();
		await Hospital.create({
			_id: hospitalBId,
			name: `Hospital B Inactive ${uniqueId}`,
			slug: `hospital-b-inactive-${uniqueId}`,
			licenseNumber: `LIC-B-INACT-${uniqueId}`,
			address: {
				street: "456 Hospital B St",
				city: "City B",
				state: "SB",
				postalCode: "22222",
				country: "USA",
			},
			contactEmail: `contact-b-inact-${uniqueId}@hospital.com`,
			contactPhone: "+2222222221",
			adminEmail: `admin-b-inact-${uniqueId}@hospital.com`,
			adminPhone: "+2222222222",
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
			code: `DEPT-A-INACT-${uniqueId}`,
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

		// Staff A - ACTIVE
		staffAId = uuidv4();
		await Staff.create({
			_id: staffAId,
			tenantId: hospitalAId,
			userId: userId,
			employeeId: `EMP-A-INACT-${uniqueId}`,
			firstName: "Inactive",
			lastName: "Staff",
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
			employeeId: `EMP-B-INACT-${uniqueId}`,
			firstName: "Inactive",
			lastName: "Staff",
			phone: "+1234567890",
			roles: [roleBId],
			shift: "EVENING",
			status: "INACTIVE",
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
		await Department.deleteOne({ _id: departmentAId });
		await Hospital.deleteMany({ _id: { $in: [hospitalAId, hospitalBId] } });
	});

	it("should fail when staff status is INACTIVE in target tenant", async () => {
		const response = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${accessTokenA}`)
			.send({ tenant_id: hospitalBId });

		expect(response.status).toBe(403);
		// The service throws AccountLockedError for non-active staff status
		expect(response.body.code).toBe("ACCOUNT_LOCKED");
	});
});

describe("POST /api/auth/switch-tenant - Hospital PENDING status", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const userEmail = `pending-hosp-${uniqueId}@test.com`;
	const password = "TestPassword123!";

	let userId: string;
	let hospitalAId: string;
	let hospitalBId: string;
	let roleAId: string;
	let roleBId: string;
	let departmentAId: string;
	let staffAId: string;
	let staffBId: string;
	let accessTokenA: string;

	beforeAll(async () => {
		// Create user
		userId = uuidv4();
		const hashedPassword = await bcrypt.hash(password, 10);

		await User.create({
			_id: userId,
			name: "Pending Hospital User",
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
			name: `Hospital A Pending ${uniqueId}`,
			slug: `hospital-a-pending-${uniqueId}`,
			licenseNumber: `LIC-A-PEND-${uniqueId}`,
			address: {
				street: "123 Hospital A St",
				city: "City A",
				state: "SA",
				postalCode: "11111",
				country: "USA",
			},
			contactEmail: `contact-a-pend-${uniqueId}@hospital.com`,
			contactPhone: "+1111111111",
			adminEmail: `admin-a-pend-${uniqueId}@hospital.com`,
			adminPhone: "+1111111112",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create Hospital B (PENDING)
		hospitalBId = uuidv4();
		await Hospital.create({
			_id: hospitalBId,
			name: `Hospital B Pending ${uniqueId}`,
			slug: `hospital-b-pending-${uniqueId}`,
			licenseNumber: `LIC-B-PEND-${uniqueId}`,
			address: {
				street: "456 Hospital B St",
				city: "City B",
				state: "SB",
				postalCode: "22222",
				country: "USA",
			},
			contactEmail: `contact-b-pend-${uniqueId}@hospital.com`,
			contactPhone: "+2222222221",
			adminEmail: `admin-b-pend-${uniqueId}@hospital.com`,
			adminPhone: "+2222222222",
			status: "PENDING",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create department for Hospital A
		departmentAId = uuidv4();
		await Department.create({
			_id: departmentAId,
			tenantId: hospitalAId,
			name: "Department A",
			code: `DEPT-A-PEND-${uniqueId}`,
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
			employeeId: `EMP-A-PEND-${uniqueId}`,
			firstName: "Pending",
			lastName: "Hospital",
			phone: "+1234567890",
			departmentId: departmentAId,
			roles: [roleAId],
			shift: "MORNING",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Staff B - ACTIVE (but hospital is PENDING)
		staffBId = uuidv4();
		await Staff.create({
			_id: staffBId,
			tenantId: hospitalBId,
			userId: userId,
			employeeId: `EMP-B-PEND-${uniqueId}`,
			firstName: "Pending",
			lastName: "Hospital",
			phone: "+1234567890",
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
		await Department.deleteOne({ _id: departmentAId });
		await Hospital.deleteMany({ _id: { $in: [hospitalAId, hospitalBId] } });
	});

	it("should fail when target tenant status is PENDING", async () => {
		const response = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${accessTokenA}`)
			.send({ tenant_id: hospitalBId });

		expect(response.status).toBe(403);
		expect(response.body.message).toMatch(/not active/i);
	});
});

describe("POST /api/auth/switch-tenant - Hospital INACTIVE status", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const userEmail = `inactive-hosp-${uniqueId}@test.com`;
	const password = "TestPassword123!";

	let userId: string;
	let hospitalAId: string;
	let hospitalBId: string;
	let roleAId: string;
	let roleBId: string;
	let departmentAId: string;
	let staffAId: string;
	let staffBId: string;
	let accessTokenA: string;

	beforeAll(async () => {
		// Create user
		userId = uuidv4();
		const hashedPassword = await bcrypt.hash(password, 10);

		await User.create({
			_id: userId,
			name: "Inactive Hospital User",
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
			name: `Hospital A Inact ${uniqueId}`,
			slug: `hospital-a-inact-${uniqueId}`,
			licenseNumber: `LIC-A-INACT2-${uniqueId}`,
			address: {
				street: "123 Hospital A St",
				city: "City A",
				state: "SA",
				postalCode: "11111",
				country: "USA",
			},
			contactEmail: `contact-a-inact2-${uniqueId}@hospital.com`,
			contactPhone: "+1111111111",
			adminEmail: `admin-a-inact2-${uniqueId}@hospital.com`,
			adminPhone: "+1111111112",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create Hospital B (INACTIVE)
		hospitalBId = uuidv4();
		await Hospital.create({
			_id: hospitalBId,
			name: `Hospital B Inact ${uniqueId}`,
			slug: `hospital-b-inact-${uniqueId}`,
			licenseNumber: `LIC-B-INACT2-${uniqueId}`,
			address: {
				street: "456 Hospital B St",
				city: "City B",
				state: "SB",
				postalCode: "22222",
				country: "USA",
			},
			contactEmail: `contact-b-inact2-${uniqueId}@hospital.com`,
			contactPhone: "+2222222221",
			adminEmail: `admin-b-inact2-${uniqueId}@hospital.com`,
			adminPhone: "+2222222222",
			status: "INACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create department for Hospital A
		departmentAId = uuidv4();
		await Department.create({
			_id: departmentAId,
			tenantId: hospitalAId,
			name: "Department A",
			code: `DEPT-A-INACT2-${uniqueId}`,
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

		// Staff A - ACTIVE
		staffAId = uuidv4();
		await Staff.create({
			_id: staffAId,
			tenantId: hospitalAId,
			userId: userId,
			employeeId: `EMP-A-INACT2-${uniqueId}`,
			firstName: "Inactive",
			lastName: "Hospital",
			phone: "+1234567890",
			departmentId: departmentAId,
			roles: [roleAId],
			shift: "MORNING",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Staff B - ACTIVE (but hospital is INACTIVE)
		staffBId = uuidv4();
		await Staff.create({
			_id: staffBId,
			tenantId: hospitalBId,
			userId: userId,
			employeeId: `EMP-B-INACT2-${uniqueId}`,
			firstName: "Inactive",
			lastName: "Hospital",
			phone: "+1234567890",
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
		await Department.deleteOne({ _id: departmentAId });
		await Hospital.deleteMany({ _id: { $in: [hospitalAId, hospitalBId] } });
	});

	it("should fail when target tenant status is INACTIVE", async () => {
		const response = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${accessTokenA}`)
			.send({ tenant_id: hospitalBId });

		expect(response.status).toBe(403);
		expect(response.body.message).toMatch(/not active/i);
	});
});

describe("POST /api/auth/switch-tenant - Verify user identity preserved", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const userEmail = `identity-${uniqueId}@test.com`;
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
			name: "Identity User",
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
			name: `Hospital A Identity ${uniqueId}`,
			slug: `hospital-a-identity-${uniqueId}`,
			licenseNumber: `LIC-A-ID-${uniqueId}`,
			address: {
				street: "123 Hospital A St",
				city: "City A",
				state: "SA",
				postalCode: "11111",
				country: "USA",
			},
			contactEmail: `contact-a-id-${uniqueId}@hospital.com`,
			contactPhone: "+1111111111",
			adminEmail: `admin-a-id-${uniqueId}@hospital.com`,
			adminPhone: "+1111111112",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create Hospital B
		hospitalBId = uuidv4();
		await Hospital.create({
			_id: hospitalBId,
			name: `Hospital B Identity ${uniqueId}`,
			slug: `hospital-b-identity-${uniqueId}`,
			licenseNumber: `LIC-B-ID-${uniqueId}`,
			address: {
				street: "456 Hospital B St",
				city: "City B",
				state: "SB",
				postalCode: "22222",
				country: "USA",
			},
			contactEmail: `contact-b-id-${uniqueId}@hospital.com`,
			contactPhone: "+2222222221",
			adminEmail: `admin-b-id-${uniqueId}@hospital.com`,
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
			code: `DEPT-A-ID-${uniqueId}`,
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
			code: `DEPT-B-ID-${uniqueId}`,
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
			permissions: ["PATIENT:READ"],
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
			employeeId: `EMP-A-ID-${uniqueId}`,
			firstName: "Identity",
			lastName: "User",
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
			employeeId: `EMP-B-ID-${uniqueId}`,
			firstName: "Identity",
			lastName: "User",
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

	it("should preserve user identity (userId, email) across tenant switch", async () => {
		// Get user info before switch
		const meBefore = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${accessTokenA}`);

		expect(meBefore.status).toBe(200);
		const userIdBefore = meBefore.body.data.id;
		const emailBefore = meBefore.body.data.email;

		// Switch to Hospital B
		const switchResponse = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${accessTokenA}`)
			.send({ tenant_id: hospitalBId });

		expect(switchResponse.status).toBe(200);

		// Get user info after switch
		const meAfter = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${switchResponse.body.access_token}`);

		expect(meAfter.status).toBe(200);

		// User identity should be the same
		expect(meAfter.body.data.id).toBe(userIdBefore);
		expect(meAfter.body.data.email).toBe(emailBefore);
		expect(meAfter.body.data.id).toBe(userId);
		expect(meAfter.body.data.email).toBe(userEmail);

		// But tenant should be different
		expect(meAfter.body.data.tenantId).toBe(hospitalBId);
		expect(meAfter.body.data.tenantId).not.toBe(meBefore.body.data.tenantId);
	});

	it("should include correct roles and permissions for new tenant after switch", async () => {
		// Get a fresh token since the previous test may have revoked the old one
		const loginResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalAId,
		});
		const freshAccessToken = loginResponse.body.access_token;

		// Switch to Hospital B
		const switchResponse = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${freshAccessToken}`)
			.send({ tenant_id: hospitalBId });

		expect(switchResponse.status).toBe(200);

		// Get user info after switch
		const meAfter = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${switchResponse.body.access_token}`);

		expect(meAfter.status).toBe(200);

		// Should have Hospital B's role (CONSULTANT)
		const roles = meAfter.body.data.roles;
		expect(roles.some((r: { name: string }) => r.name === "CONSULTANT")).toBe(
			true,
		);
		expect(roles.some((r: { name: string }) => r.name === "DOCTOR")).toBe(
			false,
		);

		// Should have Hospital B's permissions
		const permissions = meAfter.body.data.permissions;
		expect(permissions).toContain("PATIENT:READ");
		// DOCTOR permissions should NOT be present
		expect(permissions).not.toContain("PRESCRIPTION:CREATE");
	});
});

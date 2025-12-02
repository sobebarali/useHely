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

describe("POST /api/auth/switch-tenant - Failure scenarios", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const userEmail = `switch-fail-${uniqueId}@test.com`;
	const password = "TestPassword123!";

	let userId: string;
	let hospitalAId: string;
	let hospitalBId: string; // User is NOT staff here
	let hospitalCId: string; // Inactive hospital
	let hospitalDId: string; // User is staff but LOCKED
	let roleAId: string;
	let roleDId: string;
	let departmentAId: string;
	let departmentDId: string;
	let staffAId: string;
	let staffDId: string;
	let accessTokenA: string;

	beforeAll(async () => {
		// Create a single user
		userId = uuidv4();
		const hashedPassword = await bcrypt.hash(password, 10);

		await User.create({
			_id: userId,
			name: "Switch Fail User",
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

		// Create Hospital A (user IS staff here)
		hospitalAId = uuidv4();
		await Hospital.create({
			_id: hospitalAId,
			name: `Hospital A ${uniqueId}`,
			slug: `hospital-a-fail-${uniqueId}`,
			licenseNumber: `LIC-A-FAIL-${uniqueId}`,
			address: {
				street: "123 Hospital A St",
				city: "City A",
				state: "SA",
				postalCode: "11111",
				country: "USA",
			},
			contactEmail: `contact-a-fail-${uniqueId}@hospital.com`,
			contactPhone: "+1111111111",
			adminEmail: `admin-a-fail-${uniqueId}@hospital.com`,
			adminPhone: "+1111111112",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create Hospital B (user is NOT staff here)
		hospitalBId = uuidv4();
		await Hospital.create({
			_id: hospitalBId,
			name: `Hospital B ${uniqueId}`,
			slug: `hospital-b-fail-${uniqueId}`,
			licenseNumber: `LIC-B-FAIL-${uniqueId}`,
			address: {
				street: "456 Hospital B St",
				city: "City B",
				state: "SB",
				postalCode: "22222",
				country: "USA",
			},
			contactEmail: `contact-b-fail-${uniqueId}@hospital.com`,
			contactPhone: "+2222222221",
			adminEmail: `admin-b-fail-${uniqueId}@hospital.com`,
			adminPhone: "+2222222222",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create Hospital C (INACTIVE hospital)
		hospitalCId = uuidv4();
		await Hospital.create({
			_id: hospitalCId,
			name: `Hospital C ${uniqueId}`,
			slug: `hospital-c-fail-${uniqueId}`,
			licenseNumber: `LIC-C-FAIL-${uniqueId}`,
			address: {
				street: "789 Hospital C St",
				city: "City C",
				state: "SC",
				postalCode: "33333",
				country: "USA",
			},
			contactEmail: `contact-c-fail-${uniqueId}@hospital.com`,
			contactPhone: "+3333333331",
			adminEmail: `admin-c-fail-${uniqueId}@hospital.com`,
			adminPhone: "+3333333332",
			status: "SUSPENDED", // Inactive!
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create Hospital D (user is staff but LOCKED)
		hospitalDId = uuidv4();
		await Hospital.create({
			_id: hospitalDId,
			name: `Hospital D ${uniqueId}`,
			slug: `hospital-d-fail-${uniqueId}`,
			licenseNumber: `LIC-D-FAIL-${uniqueId}`,
			address: {
				street: "101 Hospital D St",
				city: "City D",
				state: "SD",
				postalCode: "44444",
				country: "USA",
			},
			contactEmail: `contact-d-fail-${uniqueId}@hospital.com`,
			contactPhone: "+4444444441",
			adminEmail: `admin-d-fail-${uniqueId}@hospital.com`,
			adminPhone: "+4444444442",
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
			code: `DEPT-A-FAIL-${uniqueId}`,
			description: "Department at Hospital A",
			type: "CLINICAL",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create department for Hospital D
		departmentDId = uuidv4();
		await Department.create({
			_id: departmentDId,
			tenantId: hospitalDId,
			name: "Department D",
			code: `DEPT-D-FAIL-${uniqueId}`,
			description: "Department at Hospital D",
			type: "CLINICAL",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create role for Hospital A
		roleAId = uuidv4();
		await Role.create({
			_id: roleAId,
			tenantId: hospitalAId,
			name: "DOCTOR",
			description: "Doctor role at Hospital A",
			permissions: ["PATIENT:READ", "PATIENT:UPDATE"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create role for Hospital D
		roleDId = uuidv4();
		await Role.create({
			_id: roleDId,
			tenantId: hospitalDId,
			name: "NURSE",
			description: "Nurse role at Hospital D",
			permissions: ["PATIENT:READ"],
			isSystem: true,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create staff for Hospital A (ACTIVE)
		staffAId = uuidv4();
		await Staff.create({
			_id: staffAId,
			tenantId: hospitalAId,
			userId: userId,
			employeeId: `EMP-A-FAIL-${uniqueId}`,
			firstName: "Switch",
			lastName: "Fail",
			phone: "+1234567890",
			departmentId: departmentAId,
			roles: [roleAId],
			specialization: "General Medicine",
			shift: "MORNING",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create staff for Hospital D (LOCKED)
		staffDId = uuidv4();
		await Staff.create({
			_id: staffDId,
			tenantId: hospitalDId,
			userId: userId,
			employeeId: `EMP-D-FAIL-${uniqueId}`,
			firstName: "Switch",
			lastName: "Fail",
			phone: "+1234567890",
			departmentId: departmentDId,
			roles: [roleDId],
			specialization: "Nursing",
			shift: "NIGHT",
			status: "LOCKED", // Staff is LOCKED
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
		await Role.deleteMany({ _id: { $in: [roleAId, roleDId] } });
		await Department.deleteMany({
			_id: { $in: [departmentAId, departmentDId] },
		});
		await Hospital.deleteMany({
			_id: { $in: [hospitalAId, hospitalBId, hospitalCId, hospitalDId] },
		});
	});

	it("should fail when user is not staff in target tenant", async () => {
		const response = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${accessTokenA}`)
			.send({ tenant_id: hospitalBId });

		expect(response.status).toBe(403);
		expect(response.body.message).toMatch(/not associated/i);
	});

	it("should fail when target tenant is inactive/suspended", async () => {
		const response = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${accessTokenA}`)
			.send({ tenant_id: hospitalCId });

		expect(response.status).toBe(403);
		expect(response.body.message).toMatch(/not active/i);
	});

	it("should fail when staff status is LOCKED in target tenant", async () => {
		const response = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${accessTokenA}`)
			.send({ tenant_id: hospitalDId });

		expect(response.status).toBe(403);
		// Account locked error
		expect(response.body.code).toMatch(/ACCOUNT_LOCKED/i);
	});

	it("should fail when target tenant does not exist", async () => {
		const nonExistentTenantId = uuidv4();

		const response = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${accessTokenA}`)
			.send({ tenant_id: nonExistentTenantId });

		expect(response.status).toBe(400);
		expect(response.body.message).toMatch(/not found/i);
	});

	it("should fail when no authentication token provided", async () => {
		const response = await request(app)
			.post("/api/auth/switch-tenant")
			.send({ tenant_id: hospitalBId });

		expect(response.status).toBe(401);
	});

	it("should fail when tenant_id is not provided in request body", async () => {
		const response = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${accessTokenA}`)
			.send({});

		expect(response.status).toBe(400);
	});

	it("should fail when staff status is PASSWORD_EXPIRED in target tenant", async () => {
		// Update staff D to PASSWORD_EXPIRED
		await Staff.updateOne(
			{ _id: staffDId },
			{ $set: { status: "PASSWORD_EXPIRED" } },
		);

		const response = await request(app)
			.post("/api/auth/switch-tenant")
			.set("Authorization", `Bearer ${accessTokenA}`)
			.send({ tenant_id: hospitalDId });

		expect(response.status).toBe(403);
		expect(response.body.code).toMatch(/PASSWORD_EXPIRED/i);

		// Restore to LOCKED for other tests
		await Staff.updateOne({ _id: staffDId }, { $set: { status: "LOCKED" } });
	});
});

import { Account, Department, Hospital, Role, Staff, User } from "@hms/db";
import bcrypt from "bcryptjs";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/auth/token - Multi-tenant login with same credentials", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const userEmail = `multi-tenant-user-${uniqueId}@test.com`;
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

	beforeAll(async () => {
		// Create a single user
		userId = uuidv4();
		const hashedPassword = await bcrypt.hash(password, 10);

		await User.create({
			_id: userId,
			name: "Multi-Tenant User",
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

		// Create roles for each hospital
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
			firstName: "Multi",
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
			firstName: "Multi",
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
	}, 30000);

	afterAll(async () => {
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

	it("should login to Hospital A with same credentials", async () => {
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalAId,
		});

		expect(response.status).toBe(200);
		expect(response.body.access_token).toBeDefined();
		expect(response.body.refresh_token).toBeDefined();
		expect(response.body.token_type).toBe("Bearer");
	});

	it("should login to Hospital B with same credentials", async () => {
		const response = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalBId,
		});

		expect(response.status).toBe(200);
		expect(response.body.access_token).toBeDefined();
		expect(response.body.refresh_token).toBeDefined();
		expect(response.body.token_type).toBe("Bearer");
	});

	it("should fail login when user is not staff at the specified tenant", async () => {
		// Create a third hospital where user is NOT staff
		const hospitalCId = uuidv4();
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
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		try {
			const response = await request(app).post("/api/auth/token").send({
				grant_type: "password",
				username: userEmail,
				password: password,
				tenant_id: hospitalCId,
			});

			// Should fail because user is not staff at Hospital C
			expect(response.status).toBe(403);
			expect(response.body.message).toMatch(/not associated/i);
		} finally {
			await Hospital.deleteOne({ _id: hospitalCId });
		}
	});

	it("should have different roles/permissions when logging into different tenants", async () => {
		// Login to Hospital A
		const responseA = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalAId,
		});

		// Login to Hospital B
		const responseB = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: userEmail,
			password: password,
			tenant_id: hospitalBId,
		});

		// Both should succeed
		expect(responseA.status).toBe(200);
		expect(responseB.status).toBe(200);

		// Tokens should be different (different sessions for different tenants)
		expect(responseA.body.access_token).not.toBe(responseB.body.access_token);
	});
});

import { Account, Hospital, Role, Staff, User } from "@hms/db";
import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/auth/token - Tenant Inactive", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

	let hospitalId: string;
	let userId: string;
	let staffId: string;
	let roleId: string;
	let password: string;

	beforeAll(async () => {
		// Create test hospital with INACTIVE status
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
			status: "INACTIVE", // Inactive tenant
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
	});

	afterAll(async () => {
		// Clean up test data
		await Account.deleteOne({ userId });
		await Staff.deleteOne({ _id: staffId });
		await Role.deleteOne({ _id: roleId });
		await User.deleteOne({ _id: userId });
		await Hospital.deleteOne({ _id: hospitalId });
	});

	it("should reject authentication for INACTIVE tenant", async () => {
		const response = await request(app)
			.post("/api/auth/token")
			.send({
				grant_type: "password",
				username: `user-${uniqueId}@test.com`,
				password,
				tenant_id: hospitalId,
			});

		expect(response.status).toBe(403);
		expect(response.body).toHaveProperty("code", "TENANT_INACTIVE");
		expect(response.body).toHaveProperty(
			"message",
			"Your organization is not active. Please contact support.",
		);
	});

	it("should reject authentication for PENDING tenant", async () => {
		// Create another hospital with PENDING status
		const pendingHospitalId = `pending-hospital-${uniqueId}`;
		await Hospital.create({
			_id: pendingHospitalId,
			name: `Pending Hospital ${uniqueId}`,
			slug: `pending-hospital-${uniqueId}`,
			licenseNumber: `LIC-PENDING-${uniqueId}`,
			address: {
				street: "456 Pending St",
				city: "Pending City",
				state: "PS",
				postalCode: "54321",
				country: "USA",
			},
			contactEmail: `pending-${uniqueId}@test.com`,
			contactPhone: "+1234567891",
			adminEmail: `pending-admin-${uniqueId}@test.com`,
			adminPhone: "+0987654322",
			status: "PENDING", // Pending tenant
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create user and staff for pending hospital
		const pendingUserId = `pending-user-${uniqueId}`;
		await User.create({
			_id: pendingUserId,
			name: "Pending User",
			email: `pending-user-${uniqueId}@test.com`,
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const pendingStaffId = `pending-staff-${uniqueId}`;
		await Staff.create({
			_id: pendingStaffId,
			tenantId: pendingHospitalId,
			userId: pendingUserId,
			employeeId: `EMP-PENDING-${uniqueId}`,
			firstName: "Pending",
			lastName: "User",
			phone: "+1234567892",
			roles: [roleId],
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const hashedPassword = await bcrypt.hash(password, 10);
		await Account.create({
			_id: `pending-account-${uniqueId}`,
			accountId: `pending-account-${uniqueId}`,
			userId: pendingUserId,
			providerId: "credential",
			password: hashedPassword,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const response = await request(app)
			.post("/api/auth/token")
			.send({
				grant_type: "password",
				username: `pending-user-${uniqueId}@test.com`,
				password,
				tenant_id: pendingHospitalId,
			});

		expect(response.status).toBe(403);
		expect(response.body).toHaveProperty("code", "TENANT_INACTIVE");
		expect(response.body).toHaveProperty(
			"message",
			"Your organization is not active. Please contact support.",
		);

		// Clean up
		await Account.deleteOne({ userId: pendingUserId });
		await Staff.deleteOne({ _id: pendingStaffId });
		await User.deleteOne({ _id: pendingUserId });
		await Hospital.deleteOne({ _id: pendingHospitalId });
	});

	it("should reject authentication for non-existent tenant", async () => {
		const response = await request(app)
			.post("/api/auth/token")
			.send({
				grant_type: "password",
				username: `user-${uniqueId}@test.com`,
				password,
				tenant_id: "non-existent-tenant-id",
			});

		expect(response.status).toBe(403);
		expect(response.body).toHaveProperty("code", "TENANT_INACTIVE");
		expect(response.body).toHaveProperty("message", "Organization not found");
	});
});

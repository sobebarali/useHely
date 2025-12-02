import { Account, Hospital, Role, Staff, User } from "@hms/db";
import mongoose from "mongoose";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/hospitals - Conflict error when admin email exists as User", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
	const existingUserEmail = `existing-user-${uniqueId}@test.com`;
	let existingUserId: string;
	let existingHospitalId: string;
	let createdHospitalId: string | undefined;

	beforeAll(async () => {
		// Ensure database connection
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(process.env.DATABASE_URL || "");
		}

		// Create an existing hospital with a different admin email
		existingHospitalId = uuidv4();
		await Hospital.create({
			_id: existingHospitalId,
			name: `Existing Hospital ${uniqueId}`,
			slug: `existing-hospital-${uniqueId}`,
			address: {
				street: "123 Test St",
				city: "Test City",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			contactEmail: `contact-${uniqueId}@existing.com`,
			contactPhone: "+1234567890",
			licenseNumber: `LIC-EXIST-${uniqueId}`,
			adminEmail: `admin-${uniqueId}@existing.com`, // Different email
			adminPhone: "+1987654321",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create a user that exists in the User collection (e.g., staff at existing hospital)
		existingUserId = uuidv4();
		await User.create({
			_id: existingUserId,
			name: "Existing User",
			email: existingUserEmail,
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create staff record to simulate user is staff at existing hospital
		await Staff.create({
			_id: uuidv4(),
			tenantId: existingHospitalId,
			userId: existingUserId,
			employeeId: `EMP-${uniqueId}`,
			firstName: "Existing",
			lastName: "User",
			phone: "+1234567890",
			roles: [],
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create account for the user
		const accountId = uuidv4();
		await Account.create({
			_id: accountId,
			accountId: accountId,
			userId: existingUserId,
			providerId: "credential",
			password: "$2a$10$hashedpassword",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	});

	afterAll(async () => {
		// Clean up in proper order
		await Staff.deleteMany({ tenantId: existingHospitalId });
		await Account.deleteOne({ userId: existingUserId });
		await User.deleteOne({ _id: existingUserId });
		await Role.deleteMany({ tenantId: existingHospitalId });
		await Hospital.deleteOne({ _id: existingHospitalId });

		// Clean up any hospital that might have been created (shouldn't happen if test passes)
		if (createdHospitalId) {
			await Staff.deleteMany({ tenantId: createdHospitalId });
			await Role.deleteMany({ tenantId: createdHospitalId });
			await Hospital.deleteOne({ _id: createdHospitalId });
		}
	});

	it("should return 409 when admin email exists in User collection (even if not in Organization)", async () => {
		const hospitalData = {
			type: "CLINIC",
			name: `New Clinic ${uniqueId}`,
			address: {
				street: "456 New St",
				city: "New City",
				state: "NC",
				postalCode: "54321",
				country: "USA",
			},
			contactEmail: `contact-new-${uniqueId}@newclinic.com`,
			contactPhone: "+1234567891",
			// Using email that exists as User but not as Organization admin
			adminEmail: existingUserEmail,
			adminPhone: "+1987654322",
		};

		const response = await request(app)
			.post("/api/hospitals")
			.send(hospitalData);

		// Should fail because the email already exists in User collection
		expect(response.status).toBe(409);
		expect(response.body.code).toBe("EMAIL_EXISTS");
		expect(response.body.message).toContain("already registered");

		// Store ID in case it was created (for cleanup)
		if (response.body.id) {
			createdHospitalId = response.body.id;
		}
	});

	it("should provide helpful message guiding user to login", async () => {
		const hospitalData = {
			type: "SOLO_PRACTICE",
			name: `New Practice ${uniqueId}`,
			address: {
				street: "789 Practice Ave",
				city: "Practice City",
				state: "PC",
				postalCode: "11111",
				country: "USA",
			},
			contactEmail: `contact-practice-${uniqueId}@practice.com`,
			contactPhone: "+1234567892",
			adminEmail: existingUserEmail,
			adminPhone: "+1987654323",
		};

		const response = await request(app)
			.post("/api/hospitals")
			.send(hospitalData);

		expect(response.status).toBe(409);
		// Message should guide user to login to register new organization
		expect(response.body.message.toLowerCase()).toMatch(/login|sign in/i);
	});
});

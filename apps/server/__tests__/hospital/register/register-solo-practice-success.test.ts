import { Organization, OrganizationStatus, Role, Staff, User } from "@hms/db";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/hospitals - Successfully register a new SOLO_PRACTICE (self-service)", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
	let createdOrganizationId: string;

	beforeAll(async () => {
		// Ensure database connection
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(process.env.DATABASE_URL || "");
		}
	});

	afterAll(async () => {
		// Clean up in proper order (respecting foreign keys)
		if (createdOrganizationId) {
			// Clean up staff records
			await Staff.deleteMany({ tenantId: createdOrganizationId });
			// Clean up user accounts
			const staff = await Staff.find({ tenantId: createdOrganizationId });
			for (const s of staff) {
				await User.deleteOne({ _id: s.userId });
			}
			// Clean up roles
			await Role.deleteMany({ tenantId: createdOrganizationId });
			// Clean up organization
			await Organization.deleteOne({ _id: createdOrganizationId });
		}
	});

	it("should register a SOLO_PRACTICE with instant activation (no verification required)", async () => {
		const soloPracticeData = {
			type: "SOLO_PRACTICE",
			name: `Dr. Smith Practice ${uniqueId}`,
			address: {
				street: "789 Private Practice Lane",
				city: "Chicago",
				state: "IL",
				postalCode: "60601",
				country: "USA",
			},
			contactEmail: `contact-${uniqueId}@drsmith.com`,
			contactPhone: "+1234567890",
			// No licenseNumber required for SOLO_PRACTICE
			adminEmail: `admin-${uniqueId}@drsmith.com`,
			adminPhone: "+1987654321",
		};

		const response = await request(app)
			.post("/api/hospitals")
			.send(soloPracticeData);

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("id");
		expect(response.body).toHaveProperty("tenantId");
		expect(response.body.name).toBe(soloPracticeData.name);
		expect(response.body.type).toBe("SOLO_PRACTICE");
		// SOLO_PRACTICE should be ACTIVE immediately (self-service flow)
		expect(response.body.status).toBe(OrganizationStatus.ACTIVE);
		expect(response.body.message).toContain("practice");

		// Store for cleanup
		createdOrganizationId = response.body.id;

		// Verify database entry
		const organization = await Organization.findById(createdOrganizationId);
		expect(organization).toBeDefined();
		expect(organization?.type).toBe("SOLO_PRACTICE");
		expect(organization?.status).toBe(OrganizationStatus.ACTIVE);
		// License number should not be set for SOLO_PRACTICE
		expect(organization?.licenseNumber).toBeUndefined();
	});

	it("should provision admin user with both HOSPITAL_ADMIN and DOCTOR roles for SOLO_PRACTICE", async () => {
		// The previous test created the organization, now verify provisioning
		if (!createdOrganizationId) {
			return; // Skip if organization wasn't created
		}

		// Verify admin staff was created
		const staff = await Staff.findOne({ tenantId: createdOrganizationId });
		expect(staff).toBeDefined();
		expect(staff?.employeeId).toBe("EMP-00001");
		expect(staff?.status).toBe("ACTIVE");

		// Verify admin user was created
		const user = await User.findById(staff?.userId);
		expect(user).toBeDefined();
		expect(user?.emailVerified).toBe(true);

		// Verify roles were seeded
		const roles = await Role.find({ tenantId: createdOrganizationId });
		expect(roles.length).toBeGreaterThan(0);

		// Admin should have HOSPITAL_ADMIN role
		const adminRole = roles.find((r) => r.name === "HOSPITAL_ADMIN");
		expect(adminRole).toBeDefined();
		expect(staff?.roles).toContain(String(adminRole?._id));

		// SOLO_PRACTICE admin should ALSO have DOCTOR role
		const doctorRole = roles.find((r) => r.name === "DOCTOR");
		expect(doctorRole).toBeDefined();
		expect(staff?.roles).toContain(String(doctorRole?._id));
	});
});

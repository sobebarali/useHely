import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/hospitals - License number validation by organization type", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

	beforeAll(async () => {
		// Ensure database connection
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(process.env.DATABASE_URL || "");
		}
	});

	afterAll(async () => {
		// No cleanup needed - these tests don't create successful registrations
	});

	it("should reject HOSPITAL registration without licenseNumber", async () => {
		const hospitalData = {
			type: "HOSPITAL",
			name: `Test Hospital ${uniqueId}`,
			address: {
				street: "123 Medical Center Dr",
				city: "New York",
				state: "NY",
				postalCode: "10001",
				country: "USA",
			},
			contactEmail: `contact-${uniqueId}@testhospital.com`,
			contactPhone: "+1234567890",
			// Intentionally missing licenseNumber
			adminEmail: `admin-${uniqueId}@testhospital.com`,
			adminPhone: "+1987654321",
		};

		const response = await request(app)
			.post("/api/hospitals")
			.send(hospitalData);

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("errors");
		// Error should mention license number requirement
		const licenseError = response.body.errors.find(
			(e: { path: string; message: string }) =>
				e.path.includes("licenseNumber"),
		);
		expect(licenseError).toBeDefined();
		expect(licenseError.message.toLowerCase()).toContain("license");
	});

	it("should accept CLINIC registration without licenseNumber", async () => {
		const clinicData = {
			type: "CLINIC",
			name: `Test Clinic ${uniqueId}-clinic`,
			address: {
				street: "456 Clinic Way",
				city: "Boston",
				state: "MA",
				postalCode: "02108",
				country: "USA",
			},
			contactEmail: `contact-${uniqueId}-clinic@testclinic.com`,
			contactPhone: "+1234567890",
			// No licenseNumber - should be fine for CLINIC
			adminEmail: `admin-${uniqueId}-clinic@testclinic.com`,
			adminPhone: "+1987654321",
		};

		const response = await request(app).post("/api/hospitals").send(clinicData);

		// Should succeed without licenseNumber
		expect(response.status).toBe(201);
		expect(response.body.type).toBe("CLINIC");
	});

	it("should accept SOLO_PRACTICE registration without licenseNumber", async () => {
		const soloPracticeData = {
			type: "SOLO_PRACTICE",
			name: `Dr. Test Practice ${uniqueId}-solo`,
			address: {
				street: "789 Solo Way",
				city: "Chicago",
				state: "IL",
				postalCode: "60601",
				country: "USA",
			},
			contactEmail: `contact-${uniqueId}-solo@drtest.com`,
			contactPhone: "+1234567890",
			// No licenseNumber - should be fine for SOLO_PRACTICE
			adminEmail: `admin-${uniqueId}-solo@drtest.com`,
			adminPhone: "+1987654321",
		};

		const response = await request(app)
			.post("/api/hospitals")
			.send(soloPracticeData);

		// Should succeed without licenseNumber
		expect(response.status).toBe(201);
		expect(response.body.type).toBe("SOLO_PRACTICE");
	});

	it("should accept HOSPITAL registration with licenseNumber", async () => {
		const hospitalData = {
			type: "HOSPITAL",
			name: `Test Hospital ${uniqueId}-with-license`,
			address: {
				street: "123 Medical Center Dr",
				city: "New York",
				state: "NY",
				postalCode: "10001",
				country: "USA",
			},
			contactEmail: `contact-${uniqueId}-with-license@testhospital.com`,
			contactPhone: "+1234567890",
			licenseNumber: `LIC-${uniqueId}`,
			adminEmail: `admin-${uniqueId}-with-license@testhospital.com`,
			adminPhone: "+1987654321",
		};

		const response = await request(app)
			.post("/api/hospitals")
			.send(hospitalData);

		// Should succeed with licenseNumber
		expect(response.status).toBe(201);
		expect(response.body.type).toBe("HOSPITAL");
	});
});

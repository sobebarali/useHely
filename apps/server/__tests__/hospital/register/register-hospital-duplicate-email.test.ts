import { Hospital } from "@hms/db";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/hospitals - Conflict error for duplicate admin email", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
	let createdHospitalId: string;

	beforeAll(async () => {
		// Ensure database connection
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(process.env.DATABASE_URL || "");
		}

		// Create a hospital first
		const firstHospital = {
			name: `First Hospital ${uniqueId}`,
			address: {
				street: "123 Main St",
				city: "New York",
				state: "NY",
				postalCode: "10001",
				country: "USA",
			},
			contactEmail: `contact-${uniqueId}@testhospital.com`,
			contactPhone: "+1234567890",
			licenseNumber: `LIC-${uniqueId}`,
			adminEmail: `admin-${uniqueId}@testhospital.com`,
			adminPhone: "+1987654321",
		};

		const response = await request(app)
			.post("/api/hospitals")
			.send(firstHospital);

		createdHospitalId = response.body.id;
	});

	afterAll(async () => {
		// Clean up created hospital
		if (createdHospitalId) {
			await Hospital.deleteOne({ _id: createdHospitalId });
		}
	});

	it("should return 409 when admin email already exists", async () => {
		const duplicateEmailData = {
			name: `Second Hospital ${uniqueId}`,
			address: {
				street: "789 Pine Rd",
				city: "Chicago",
				state: "IL",
				postalCode: "60601",
				country: "USA",
			},
			contactEmail: `contact2-${uniqueId}@testhospital.com`,
			contactPhone: "+1234567892",
			licenseNumber: `LIC2-${uniqueId}`,
			adminEmail: `admin-${uniqueId}@testhospital.com`, // Same email as first hospital
			adminPhone: "+1987654323",
		};

		const response = await request(app)
			.post("/api/hospitals")
			.send(duplicateEmailData);

		expect(response.status).toBe(409);
		expect(response.body.code).toBe("EMAIL_EXISTS");
		expect(response.body.message).toBe("Admin email already in use");
	});
});

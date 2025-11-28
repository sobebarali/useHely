import { Hospital } from "@hms/db";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/hospitals - Successfully register a new hospital", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
	let createdHospitalId: string;

	beforeAll(async () => {
		// Ensure database connection
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(process.env.DATABASE_URL || "");
		}
	});

	afterAll(async () => {
		// Clean up created hospital
		if (createdHospitalId) {
			await Hospital.deleteOne({ _id: createdHospitalId });
		}
	});

	it("should successfully register a new hospital with valid data", async () => {
		const hospitalData = {
			name: `Test Hospital ${uniqueId}`,
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
			.send(hospitalData);

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("id");
		expect(response.body).toHaveProperty("tenantId");
		expect(response.body.name).toBe(hospitalData.name);
		expect(response.body.status).toBe("PENDING");
		expect(response.body).toHaveProperty("adminUsername");
		expect(response.body).toHaveProperty("message");

		// Verify database entry
		createdHospitalId = response.body.id;
		const hospital = await Hospital.findById(createdHospitalId);
		expect(hospital).toBeDefined();
		expect(hospital?.licenseNumber).toBe(hospitalData.licenseNumber);
		expect(hospital?.adminEmail).toBe(hospitalData.adminEmail);
		expect(hospital?.adminPhone).toBe(hospitalData.adminPhone);
	});
});

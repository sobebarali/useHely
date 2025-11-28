import { Hospital } from "@hms/db";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/hospitals/:id - Successfully retrieve hospital by ID", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
	let createdHospitalId: string;

	beforeAll(async () => {
		// Ensure database connection
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(process.env.DATABASE_URL || "");
		}

		// Create a test hospital
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

		createdHospitalId = response.body.id;
	});

	afterAll(async () => {
		// Clean up created hospital
		if (createdHospitalId) {
			await Hospital.deleteOne({ _id: createdHospitalId });
		}
	});

	it("should successfully retrieve hospital details by ID", async () => {
		const response = await request(app).get(
			`/api/hospitals/${createdHospitalId}`,
		);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("id");
		expect(response.body.id).toBe(createdHospitalId);
		expect(response.body).toHaveProperty("tenantId");
		expect(response.body).toHaveProperty("name");
		expect(response.body.name).toContain("Test Hospital");
		expect(response.body).toHaveProperty("address");
		expect(response.body.address).toHaveProperty("street");
		expect(response.body.address).toHaveProperty("city");
		expect(response.body).toHaveProperty("contactEmail");
		expect(response.body).toHaveProperty("contactPhone");
		expect(response.body).toHaveProperty("licenseNumber");
		expect(response.body).toHaveProperty("status");
		expect(response.body).toHaveProperty("createdAt");
		expect(response.body).toHaveProperty("updatedAt");

		// Verify the data matches
		expect(response.body.address.street).toBe("123 Main St");
		expect(response.body.address.city).toBe("New York");
		expect(response.body.contactPhone).toBe("+1234567890");
	});
});

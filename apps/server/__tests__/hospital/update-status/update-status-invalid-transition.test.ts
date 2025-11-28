import { Hospital } from "@hms/db";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("PATCH /api/hospitals/:id/status - Invalid status transition", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
	let createdHospitalId: string;

	beforeAll(async () => {
		// Ensure database connection
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(process.env.DATABASE_URL || "");
		}

		// Create a hospital (default status is PENDING)
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

	it("should return 400 when trying to transition from PENDING to ACTIVE (skipping VERIFIED)", async () => {
		const statusUpdate = {
			status: "ACTIVE",
		};

		const response = await request(app)
			.patch(`/api/hospitals/${createdHospitalId}/status`)
			.send(statusUpdate);

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("code");
		expect(response.body.code).toBe("INVALID_TRANSITION");
		expect(response.body).toHaveProperty("message");
		expect(response.body.message).toContain("PENDING");
		expect(response.body.message).toContain("ACTIVE");

		// Verify hospital status hasn't changed
		const hospital = await Hospital.findById(createdHospitalId);
		expect(hospital?.status).toBe("PENDING");
	});
});

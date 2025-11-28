import { Hospital } from "@hms/db";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("PATCH /api/hospitals/:id/status - Successfully update hospital status from VERIFIED to ACTIVE", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
	let createdHospitalId: string;

	beforeAll(async () => {
		// Ensure database connection
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(process.env.DATABASE_URL || "");
		}

		// Create a hospital and set it to VERIFIED status
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

		// Update hospital status to VERIFIED
		await Hospital.findByIdAndUpdate(createdHospitalId, {
			status: "VERIFIED",
		});
	});

	afterAll(async () => {
		// Clean up created hospital
		if (createdHospitalId) {
			await Hospital.deleteOne({ _id: createdHospitalId });
		}
	});

	it("should successfully update hospital status from VERIFIED to ACTIVE", async () => {
		const statusUpdate = {
			status: "ACTIVE",
			reason: "Hospital verification completed",
		};

		const response = await request(app)
			.patch(`/api/hospitals/${createdHospitalId}/status`)
			.send(statusUpdate);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("id");
		expect(response.body.id).toBe(createdHospitalId);
		expect(response.body.status).toBe("ACTIVE");
		expect(response.body).toHaveProperty("updatedAt");

		// Verify database entry
		const hospital = await Hospital.findById(createdHospitalId);
		expect(hospital).toBeDefined();
		expect(hospital?.status).toBe("ACTIVE");
	});
});

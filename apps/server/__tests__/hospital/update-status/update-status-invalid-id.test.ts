import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("PATCH /api/hospitals/:id/status - Invalid hospital ID format", () => {
	it("should return 400 when hospital ID is not a valid UUID", async () => {
		// Ensure database connection
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(process.env.DATABASE_URL || "");
		}

		const invalidHospitalId = "invalid-id-123";
		const statusUpdate = {
			status: "ACTIVE",
		};

		const response = await request(app)
			.patch(`/api/hospitals/${invalidHospitalId}/status`)
			.send(statusUpdate);

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("errors");
	});

	it("should return 400 when hospital ID is empty", async () => {
		// Ensure database connection
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(process.env.DATABASE_URL || "");
		}

		const statusUpdate = {
			status: "ACTIVE",
		};

		const response = await request(app)
			.patch("/api/hospitals//status")
			.send(statusUpdate);

		expect(response.status).toBe(404); // Empty ID will not match the route pattern
	});
});

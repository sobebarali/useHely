import { Hospital } from "@hms/db";
import mongoose from "mongoose";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("PATCH /api/hospitals/:id/status - Hospital not found", () => {
	const nonExistentHospitalId = uuidv4();
	const hospitalsToCleanup: string[] = [];

	afterAll(async () => {
		// Clean up any created hospitals (if any)
		if (hospitalsToCleanup.length > 0) {
			await Hospital.deleteMany({ _id: { $in: hospitalsToCleanup } });
		}
	});

	it("should return 404 when hospital does not exist", async () => {
		// Ensure database connection
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(process.env.DATABASE_URL || "");
		}

		const statusUpdate = {
			status: "ACTIVE",
		};

		const response = await request(app)
			.patch(`/api/hospitals/${nonExistentHospitalId}/status`)
			.send(statusUpdate);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("code");
		expect(response.body.code).toBe("NOT_FOUND");
		expect(response.body).toHaveProperty("message");
		expect(response.body.message).toContain("Hospital not found");
	});
});

import mongoose from "mongoose";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/hospitals/:id - Invalid hospital ID format", () => {
	beforeAll(async () => {
		// Ensure database connection
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(process.env.DATABASE_URL || "");
		}
	});

	it("should return 404 for malformed UUID format", async () => {
		const invalidId = "not-a-valid-uuid-format";

		const response = await request(app).get(`/api/hospitals/${invalidId}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("error");
	});

	it("should return 404 for numeric ID", async () => {
		const numericId = "12345";

		const response = await request(app).get(`/api/hospitals/${numericId}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("error");
	});

	it("should return 404 for ID with special characters", async () => {
		const specialCharId = "abc@#$%^&*()";

		const response = await request(app).get(
			`/api/hospitals/${encodeURIComponent(specialCharId)}`,
		);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("error");
	});

	it("should return 404 for very long ID string", async () => {
		const longId = "a".repeat(1000);

		const response = await request(app).get(`/api/hospitals/${longId}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("error");
	});
});

import mongoose from "mongoose";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/hospitals/:id - Hospital not found", () => {
	beforeAll(async () => {
		// Ensure database connection
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(process.env.DATABASE_URL || "");
		}
	});

	it("should return 404 when hospital ID does not exist", async () => {
		const nonExistentId = `non-existent-${Date.now()}`;

		const response = await request(app).get(`/api/hospitals/${nonExistentId}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("error");
		expect(response.body.error).toContain("not found");
	});
});

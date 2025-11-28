import mongoose from "mongoose";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/hospitals/:id - Empty or whitespace ID", () => {
	beforeAll(async () => {
		// Ensure database connection
		if (mongoose.connection.readyState === 0) {
			await mongoose.connect(process.env.DATABASE_URL || "");
		}
	});

	it("should return 404 for single space as ID", async () => {
		const spaceId = " ";

		const response = await request(app).get(
			`/api/hospitals/${encodeURIComponent(spaceId)}`,
		);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("error");
	});

	it("should return 404 for multiple spaces as ID", async () => {
		const spacesId = "   ";

		const response = await request(app).get(
			`/api/hospitals/${encodeURIComponent(spacesId)}`,
		);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("error");
	});

	it("should return 404 for tab character as ID", async () => {
		const tabId = "\t";

		const response = await request(app).get(
			`/api/hospitals/${encodeURIComponent(tabId)}`,
		);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("error");
	});

	it("should return 404 for newline character as ID", async () => {
		const newlineId = "\n";

		const response = await request(app).get(
			`/api/hospitals/${encodeURIComponent(newlineId)}`,
		);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("error");
	});
});

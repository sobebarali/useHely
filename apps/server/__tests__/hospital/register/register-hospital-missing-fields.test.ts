import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/hospitals - Validation error for missing required fields", () => {
	it("should return 400 when required fields are missing", async () => {
		const invalidData = {
			name: "Test Hospital",
			// Missing address and other required fields
		};

		const response = await request(app)
			.post("/api/hospitals")
			.send(invalidData);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
		expect(response.body).toHaveProperty("errors");
	});
});

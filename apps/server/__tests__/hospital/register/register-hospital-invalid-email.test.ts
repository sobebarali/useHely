import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/hospitals - Validation error for invalid email format", () => {
	const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

	it("should return 400 when email format is invalid", async () => {
		const invalidData = {
			name: `Test Hospital ${uniqueId}`,
			address: {
				street: "123 Main St",
				city: "New York",
				state: "NY",
				postalCode: "10001",
				country: "USA",
			},
			contactEmail: "invalid-email",
			contactPhone: "+1234567890",
			licenseNumber: `LIC-${uniqueId}`,
			adminEmail: "invalid-admin-email",
			adminPhone: "+1987654321",
		};

		const response = await request(app)
			.post("/api/hospitals")
			.send(invalidData);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
		expect(response.body).toHaveProperty("errors");
	});
});

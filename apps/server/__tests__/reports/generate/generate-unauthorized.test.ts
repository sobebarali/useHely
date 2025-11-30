import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/reports/generate - Unauthorized", () => {
	it("returns 401 when no auth token provided", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.send({
				reportType: "patient-registration",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-01-31",
				},
			});

		expect(response.status).toBe(401);
		expect(response.body).toHaveProperty("code");
	});

	it("returns 401 when invalid auth token provided", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", "Bearer invalid-token")
			.send({
				reportType: "patient-registration",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-01-31",
				},
			});

		expect(response.status).toBe(401);
		expect(response.body).toHaveProperty("code");
	});
});

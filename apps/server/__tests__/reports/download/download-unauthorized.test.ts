import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/reports/:reportId/download - Unauthorized", () => {
	it("returns 401 when no auth token provided", async () => {
		const reportId = `rpt_${uuidv4()}`;
		const response = await request(app).get(
			`/api/reports/${reportId}/download`,
		);

		expect(response.status).toBe(401);
		expect(response.body).toHaveProperty("code");
	});

	it("returns 401 when invalid auth token provided", async () => {
		const reportId = `rpt_${uuidv4()}`;
		const response = await request(app)
			.get(`/api/reports/${reportId}/download`)
			.set("Authorization", "Bearer invalid-token");

		expect(response.status).toBe(401);
		expect(response.body).toHaveProperty("code");
	});
});

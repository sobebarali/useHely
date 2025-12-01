import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/compliance/data-export - Unauthorized", () => {
	it("returns 401 without authentication", async () => {
		const response = await request(app)
			.post("/api/compliance/data-export")
			.send({
				format: "json",
				includeAuditLog: true,
			});

		expect(response.status).toBe(401);
	});

	it("returns 401 with invalid token", async () => {
		const response = await request(app)
			.post("/api/compliance/data-export")
			.set("Authorization", "Bearer invalid-token")
			.send({
				format: "json",
				includeAuditLog: true,
			});

		expect(response.status).toBe(401);
	});
});

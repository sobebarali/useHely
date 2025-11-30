import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/inventory/medicines - Add medicine unauthorized", () => {
	it("returns 401 when no token is provided", async () => {
		const response = await request(app).post("/api/inventory/medicines").send({
			name: "Test Medicine",
			genericName: "Test Generic",
			category: "ANALGESICS",
			type: "TABLET",
			unit: "tablets",
		});

		expect(response.status).toBe(401);
	});

	it("returns 401 when invalid token is provided", async () => {
		const response = await request(app)
			.post("/api/inventory/medicines")
			.set("Authorization", "Bearer invalid-token")
			.send({
				name: "Test Medicine",
				genericName: "Test Generic",
				category: "ANALGESICS",
				type: "TABLET",
				unit: "tablets",
			});

		expect(response.status).toBe(401);
	});
});

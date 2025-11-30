import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/appointments/availability/:doctorId - Returns 401 without authentication", () => {
	it("returns 401 without authentication", async () => {
		const fakeId = uuidv4();
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const dateStr = tomorrow.toISOString().split("T")[0];

		const response = await request(app)
			.get(`/api/appointments/availability/${fakeId}`)
			.query({ date: dateStr });

		expect(response.status).toBe(401);
	});
});

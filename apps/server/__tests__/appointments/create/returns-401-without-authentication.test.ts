import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/appointments - Returns 401 without authentication", () => {
	it("returns 401 when no authorization header is provided", async () => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);

		const payload = {
			patientId: uuidv4(),
			doctorId: uuidv4(),
			departmentId: uuidv4(),
			date: tomorrow.toISOString(),
			timeSlot: {
				start: "10:00",
				end: "10:30",
			},
			type: "CONSULTATION",
		};

		const response = await request(app).post("/api/appointments").send(payload);

		expect(response.status).toBe(401);
	});
});

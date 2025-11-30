import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("GET /api/appointments/:id - Returns 401 without authentication", () => {
	it("returns 401 when no token is provided", async () => {
		const fakeId = uuidv4();
		const response = await request(app).get(`/api/appointments/${fakeId}`);

		expect(response.status).toBe(401);
	});
});

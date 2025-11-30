import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("DELETE /api/appointments/:id - Returns 401 without authentication", () => {
	it("returns 401 without authentication", async () => {
		const fakeId = uuidv4();
		const response = await request(app).delete(`/api/appointments/${fakeId}`);

		expect(response.status).toBe(401);
	});
});

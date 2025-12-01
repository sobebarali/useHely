import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/compliance/consent - Record consent unauthorized", () => {
	it("returns 401 without authentication", async () => {
		const payload = {
			purpose: "marketing_emails",
			granted: true,
			source: "settings",
		};

		const response = await request(app)
			.post("/api/compliance/consent")
			.send(payload);

		expect(response.status).toBe(401);
	});
});

import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/auth/revoke - Missing authorization header", () => {
	it("rejects requests without bearer token", async () => {
		const response = await request(app).post("/api/auth/revoke").send({
			token: "any-token",
		});

		expect(response.status).toBe(401);
		expect(response.body).toMatchObject({
			code: "UNAUTHORIZED",
			message: "No authorization token provided",
		});
	});
});

import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/users - Unauthorized (no token)", () => {
	it("returns 401 when no authorization token is provided", async () => {
		const payload = {
			firstName: "John",
			lastName: "Doe",
			email: "john.doe@test.com",
			phone: "+1234567890",
			department: "some-department-id",
			roles: ["some-role-id"],
		};

		const response = await request(app).post("/api/users").send(payload);

		expect(response.status).toBe(401);
		expect(response.body.code).toBe("UNAUTHORIZED");
	});
});

import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../../src/index";

describe("POST /api/users/change-password - Unauthorized", () => {
	it("returns 401 when no token is provided", async () => {
		const payload = {
			currentPassword: "OldPassword123!",
			newPassword: "NewSecurePass123!",
			confirmPassword: "NewSecurePass123!",
		};

		const response = await request(app)
			.post("/api/users/change-password")
			.send(payload);

		expect(response.status).toBe(401);
	});

	it("returns 401 when token is invalid", async () => {
		const payload = {
			currentPassword: "OldPassword123!",
			newPassword: "NewSecurePass123!",
			confirmPassword: "NewSecurePass123!",
		};

		const response = await request(app)
			.post("/api/users/change-password")
			.set("Authorization", "Bearer invalid-token")
			.send(payload);

		expect(response.status).toBe(401);
	});
});

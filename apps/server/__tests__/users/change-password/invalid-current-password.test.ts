import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/users/change-password - Invalid current password", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["USER:READ"],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 401 when current password is incorrect", async () => {
		const payload = {
			currentPassword: "WrongPassword123!",
			newPassword: "NewSecurePass123!",
			confirmPassword: "NewSecurePass123!",
		};

		const response = await request(app)
			.post("/api/users/change-password")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(401);
		expect(response.body.code).toBe("INVALID_CREDENTIALS");
	});
});

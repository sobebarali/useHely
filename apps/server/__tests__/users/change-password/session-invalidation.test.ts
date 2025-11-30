import { Session } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/users/change-password - Session invalidation", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let refreshToken: string;
	const newPassword = "NewSecurePass123!";

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["USER:READ"],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
		refreshToken = tokens.refreshToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("invalidates all sessions after password change", async () => {
		// Get session count before
		const sessionsBefore = await Session.countDocuments({
			userId: context.userId,
		});
		expect(sessionsBefore).toBeGreaterThan(0);

		const payload = {
			currentPassword: context.password,
			newPassword,
			confirmPassword: newPassword,
		};

		const response = await request(app)
			.post("/api/users/change-password")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(200);

		// Verify all sessions are invalidated
		const sessionsAfter = await Session.countDocuments({
			userId: context.userId,
		});
		expect(sessionsAfter).toBe(0);

		// Old refresh token should not work
		const refreshResponse = await request(app).post("/api/auth/token").send({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
		});

		expect(refreshResponse.status).toBe(401);
	});
});

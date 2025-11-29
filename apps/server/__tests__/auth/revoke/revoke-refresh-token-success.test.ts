import { Session } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/auth/revoke - Refresh token revocation", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let refreshToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext();
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
		refreshToken = tokens.refreshToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("revokes refresh token and clears all user sessions", async () => {
		const response = await request(app)
			.post("/api/auth/revoke")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				token: refreshToken,
				token_type_hint: "refresh_token",
			});

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("revoked", true);

		const sessions = await Session.find({
			userId: context.userId,
		});

		expect(sessions.length).toBe(0);
	});
});

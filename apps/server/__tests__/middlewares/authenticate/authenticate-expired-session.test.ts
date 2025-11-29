import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authenticate } from "../../../src/middlewares/authenticate";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

const app = express();
app.get("/protected", authenticate, (_req, res) => {
	res.status(200).json({ ok: true });
});

describe("authenticate middleware - expired sessions", () => {
	let context: AuthTestContext;
	let expiredToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext();
		expiredToken = await context.createSessionToken({
			expiresAt: new Date(Date.now() - 60 * 1000),
		});
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("rejects expired session tokens", async () => {
		const response = await request(app)
			.get("/protected")
			.set("Authorization", `Bearer ${expiredToken}`);

		expect(response.status).toBe(401);
		expect(response.body).toMatchObject({
			code: "TOKEN_EXPIRED",
			message: "Session not found or has expired",
		});
	});
});

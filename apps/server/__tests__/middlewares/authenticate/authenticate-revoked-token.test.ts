import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { revokeToken } from "../../../src/lib/cache/auth.cache";
import { redis } from "../../../src/lib/redis";
import { authenticate } from "../../../src/middlewares/authenticate";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

const app = express();
app.get("/protected", authenticate, (_req, res) => {
	res.status(200).json({ ok: true });
});

describe("authenticate middleware - revoked token handling", () => {
	let context: AuthTestContext;
	let revokedToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext();
		revokedToken = await context.createSessionToken();
		await revokeToken({ token: revokedToken });
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
		const tokenHash = Buffer.from(revokedToken).toString("base64").slice(0, 32);
		await redis.del(`revoked:${tokenHash}`);
	});

	it("denies access when token is marked as revoked", async () => {
		const response = await request(app)
			.get("/protected")
			.set("Authorization", `Bearer ${revokedToken}`);

		expect(response.status).toBe(401);
		expect(response.body).toMatchObject({
			code: "INVALID_TOKEN",
			message: "Token has been revoked",
		});
	});
});

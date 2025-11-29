import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { authenticate } from "../../../src/middlewares/authenticate";

const app = express();
app.get("/protected", authenticate, (_req, res) => {
	res.status(200).json({ ok: true });
});

describe("authenticate middleware - missing authorization header", () => {
	it("denies access when no Authorization header is present", async () => {
		const response = await request(app).get("/protected");

		expect(response.status).toBe(401);
		expect(response.body).toMatchObject({
			code: "UNAUTHORIZED",
			message: "No authorization token provided",
		});
	});
});

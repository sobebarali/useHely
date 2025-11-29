import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { authorize } from "../../../src/middlewares/authorize";

const app = express();
app.get("/secure", authorize("PATIENT:READ"), (_req, res) => {
	res.status(200).json({ ok: true });
});

describe("authorize middleware - missing user", () => {
	it("returns 401 when request is unauthenticated", async () => {
		const response = await request(app).get("/secure");

		expect(response.status).toBe(401);
		expect(response.body).toMatchObject({
			code: "UNAUTHORIZED",
			message: "Authentication required",
		});
	});
});

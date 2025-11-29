import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { authorize } from "../../../src/middlewares/authorize";

const app = express();
app.get(
	"/secure",
	(req, _res, next) => {
		req.user = {
			id: "user-1",
			email: "user@example.com",
			name: "Test User",
			tenantId: "",
			roles: [],
			permissions: [],
		};
		next();
	},
	authorize("ROLE:CREATE"),
	(_req, res) => {
		res.status(200).json({ ok: true });
	},
);

describe("authorize middleware - insufficient permissions", () => {
	it("returns 403 when required permission is missing", async () => {
		const response = await request(app).get("/secure");

		expect(response.status).toBe(403);
		expect(response.body).toMatchObject({
			code: "PERMISSION_DENIED",
			message: "You do not have permission to perform this action: ROLE:CREATE",
		});
	});
});

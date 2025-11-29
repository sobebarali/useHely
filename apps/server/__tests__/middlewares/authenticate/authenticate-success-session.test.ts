import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authenticate } from "../../../src/middlewares/authenticate";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

const app = express();
app.get("/protected", authenticate, (req, res) => {
	res.status(200).json({ user: req.user });
});

describe("authenticate middleware - successful session lookup", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("populates req.user with tenant, roles, and permissions", async () => {
		const response = await request(app)
			.get("/protected")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.user).toMatchObject({
			id: context.userId,
			tenantId: context.hospitalId,
		});

		expect(response.body.user.roles.length).toBeGreaterThan(0);
		expect(response.body.user.permissions.length).toBeGreaterThan(0);
	});
});

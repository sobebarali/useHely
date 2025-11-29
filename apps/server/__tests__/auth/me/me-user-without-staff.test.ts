import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/auth/me - User without staff assignment", () => {
	let context: AuthTestContext;
	let standaloneToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			createStaff: false,
		});

		standaloneToken = await context.createSessionToken();
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns a minimal profile when no tenant assignment exists", async () => {
		const response = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${standaloneToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toMatchObject({
			id: context.userId,
			email: context.email,
			tenantId: "",
			roles: [],
			permissions: [],
		});

		expect(response.body).not.toHaveProperty("department");
		expect(response.body.attributes).toEqual({});
	});
});

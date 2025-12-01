import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/compliance/data-deletion - Validation", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: [],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 400 when confirmEmail is missing", async () => {
		const response = await request(app)
			.post("/api/compliance/data-deletion")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reason: "Testing validation",
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 for invalid email format", async () => {
		const response = await request(app)
			.post("/api/compliance/data-deletion")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				confirmEmail: "not-an-email",
				reason: "Testing validation",
			});

		expect(response.status).toBe(400);
	});
});

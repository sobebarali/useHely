import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/compliance/data-deletion/:requestId/verify - Validation", () => {
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

	it("returns 400 for invalid UUID format", async () => {
		const response = await request(app)
			.post("/api/compliance/data-deletion/invalid-uuid/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				token: "some-token",
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when token is missing", async () => {
		const response = await request(app)
			.post(
				"/api/compliance/data-deletion/123e4567-e89b-12d3-a456-426614174000/verify",
			)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({});

		expect(response.status).toBe(400);
	});
});

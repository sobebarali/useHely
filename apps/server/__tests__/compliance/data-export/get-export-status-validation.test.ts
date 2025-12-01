import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/compliance/data-export/:requestId - Validation", () => {
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

	it("returns 404 for invalid request ID", async () => {
		const response = await request(app)
			.get("/api/compliance/data-export/invalid-uuid")
			.set("Authorization", `Bearer ${accessToken}`);

		// API doesn't validate UUID format, returns 404 when request not found
		expect(response.status).toBe(404);
		expect(response.body.code).toBeDefined();
	});
});

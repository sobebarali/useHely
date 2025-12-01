import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/compliance/consent/:purpose/history - Empty history", () => {
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

	it("returns empty history for a purpose with no consent", async () => {
		const response = await request(app)
			.get("/api/compliance/consent/marketing_emails/history")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toHaveProperty("purpose", "marketing_emails");
		expect(response.body.data).toHaveProperty("history");
		expect(response.body.data.history).toBeInstanceOf(Array);
		expect(response.body.data.history.length).toBe(0);
	});
});

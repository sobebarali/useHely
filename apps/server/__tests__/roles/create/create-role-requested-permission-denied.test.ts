import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/roles - Prevent granting unknown permissions", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["ROLE:CREATE", "PATIENT:READ"],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("rejects attempts to grant permissions the user does not own", async () => {
		const response = await request(app)
			.post("/api/roles")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				name: `Unauthorized Grant ${context.uniqueId}`,
				description: "Should not be allowed",
				permissions: ["INVENTORY:MANAGE"],
			});

		expect(response.status).toBe(403);
		expect(response.body).toMatchObject({
			code: "PERMISSION_DENIED",
			message: "You cannot grant permissions you don't have",
		});
	});
});

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/roles - Missing ROLE:CREATE permission", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["PATIENT:READ"],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 403 when the caller lacks ROLE:CREATE", async () => {
		const response = await request(app)
			.post("/api/roles")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				name: `Custom ${context.uniqueId}`,
				description: "Should fail",
				permissions: ["PATIENT:READ"],
			});

		expect(response.status).toBe(403);
		expect(response.body).toMatchObject({
			code: "PERMISSION_DENIED",
			message: "You do not have permission to perform this action: ROLE:CREATE",
		});
	});
});

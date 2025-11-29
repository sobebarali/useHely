import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/roles - Authority limits", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "DOCTOR",
			rolePermissions: ["ROLE:CREATE", "ROLE:MANAGE", "PATIENT:READ"],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("prevents creating roles with permissions beyond the caller's hierarchy", async () => {
		const response = await request(app)
			.post("/api/roles")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				name: `Overreach ${context.uniqueId}`,
				description: "Attempt to exceed authority",
				permissions: ["ROLE:MANAGE"],
			});

		expect(response.status).toBe(403);
		expect(response.body).toMatchObject({
			code: "PERMISSION_DENIED",
			message: "Custom role would have permissions beyond your authority",
		});
	});
});

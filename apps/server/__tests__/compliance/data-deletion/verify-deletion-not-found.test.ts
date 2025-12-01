import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/compliance/data-deletion/:requestId/verify - Not found", () => {
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

	it("returns 404 for non-existent request ID", async () => {
		const nonExistentId = uuidv4();

		const response = await request(app)
			.post(`/api/compliance/data-deletion/${nonExistentId}/verify`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				token: "some-token",
			});

		expect(response.status).toBe(404);
		expect(response.body.code).toBe("REQUEST_NOT_FOUND");
	});
});

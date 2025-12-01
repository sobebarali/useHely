import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PUT /api/compliance/requests/:requestId/process - Not found", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["COMPLIANCE:MANAGE"],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 404 for non-existent request", async () => {
		const nonExistentId = uuidv4();

		const response = await request(app)
			.put(`/api/compliance/requests/${nonExistentId}/process`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				action: "approve",
				notes: "Trying to approve non-existent request",
			});

		expect(response.status).toBe(404);
		expect(response.body.success).toBe(false);
	});
});

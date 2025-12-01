import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PUT /api/compliance/requests/:requestId/process - Validation", () => {
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

	it("returns 400 for invalid requestId format", async () => {
		const response = await request(app)
			.put("/api/compliance/requests/invalid-uuid/process")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				action: "approve",
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBeDefined();
	});

	it("returns 400 for missing action", async () => {
		const response = await request(app)
			.put(
				"/api/compliance/requests/550e8400-e29b-41d4-a716-446655440000/process",
			)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({});

		expect(response.status).toBe(400);
		expect(response.body.code).toBeDefined();
	});

	it("returns 400 for invalid action value", async () => {
		const response = await request(app)
			.put(
				"/api/compliance/requests/550e8400-e29b-41d4-a716-446655440000/process",
			)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				action: "invalid_action",
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBeDefined();
	});
});

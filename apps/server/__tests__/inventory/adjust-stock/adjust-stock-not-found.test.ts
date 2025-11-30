import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/inventory/:id/adjust - Not Found", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:UPDATE", "INVENTORY:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 404 when inventory item does not exist", async () => {
		const nonExistentId = uuidv4();

		const response = await request(app)
			.post(`/api/inventory/${nonExistentId}/adjust`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				adjustment: 10,
				reason: "CORRECTION",
			});

		expect(response.status).toBe(404);
	});
});

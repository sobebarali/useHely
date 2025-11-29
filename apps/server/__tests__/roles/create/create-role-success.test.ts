import { Role } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/roles - Create custom role", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const createdRoleIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: [
				"ROLE:CREATE",
				"ROLE:READ",
				"ROLE:UPDATE",
				"PATIENT:READ",
			],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		for (const roleId of createdRoleIds) {
			await Role.deleteOne({ _id: roleId });
		}
		await context.cleanup();
	});

	it("creates a role when the requester has ROLE:CREATE permission", async () => {
		const payload = {
			name: `Custom Role ${context.uniqueId}`,
			description: "Custom role for testing",
			permissions: ["PATIENT:READ"],
		};

		const response = await request(app)
			.post("/api/roles")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(201);
		expect(response.body).toMatchObject({
			name: payload.name,
			description: payload.description,
			permissions: payload.permissions,
			tenantId: context.hospitalId,
			isSystem: false,
		});

		createdRoleIds.push(response.body.id);
	});
});

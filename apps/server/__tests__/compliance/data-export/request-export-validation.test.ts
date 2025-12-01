import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/compliance/data-export - Validation", () => {
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

	it("returns 400 for invalid format value", async () => {
		const response = await request(app)
			.post("/api/compliance/data-export")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				format: "xml",
				includeAuditLog: true,
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when includeAuditLog is not boolean", async () => {
		const response = await request(app)
			.post("/api/compliance/data-export")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				format: "json",
				includeAuditLog: "yes",
			});

		expect(response.status).toBe(400);
	});
});

import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/export/:exportId - Unauthorized", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let readOnlyContext: AuthTestContext;
	let readOnlyToken: string;
	const testExportId = uuidv4();

	beforeAll(async () => {
		// Create user without any audit permissions
		context = await createAuthTestContext({
			roleName: "RECEPTIONIST",
			rolePermissions: ["PATIENT:READ", "APPOINTMENT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create user with AUDIT:READ but not AUDIT:EXPORT
		readOnlyContext = await createAuthTestContext({
			roleName: "AUDIT_READER",
			rolePermissions: ["AUDIT:READ"],
		});

		const readOnlyTokens = await readOnlyContext.issuePasswordTokens();
		readOnlyToken = readOnlyTokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
		await readOnlyContext.cleanup();
	});

	it("returns 403 when user lacks AUDIT:EXPORT permission", async () => {
		const response = await request(app)
			.get(`/api/audit/export/${testExportId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});

	it("returns 403 when user only has AUDIT:READ permission", async () => {
		const response = await request(app)
			.get(`/api/audit/export/${testExportId}`)
			.set("Authorization", `Bearer ${readOnlyToken}`);

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});

	it("returns 401 when no auth token provided", async () => {
		const response = await request(app).get(
			`/api/audit/export/${testExportId}`,
		);

		expect(response.status).toBe(401);
	});

	it("returns 401 with invalid token", async () => {
		const response = await request(app)
			.get(`/api/audit/export/${testExportId}`)
			.set("Authorization", "Bearer invalid-token");

		expect(response.status).toBe(401);
	});
});

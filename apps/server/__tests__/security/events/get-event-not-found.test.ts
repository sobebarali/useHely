import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";
import { cleanupSecurityEvents } from "../../helpers/security-test-helper";

describe("GET /api/security/events/:id - Not Found", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create test context with SECURITY:READ permission
		context = await createAuthTestContext({
			roleName: "SECURITY_ADMIN",
			rolePermissions: ["SECURITY:READ", "SECURITY:MANAGE"],
			createStaff: true,
		});

		// Get access token
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await cleanupSecurityEvents(context.hospitalId);
		await context.cleanup();
	});

	it("should return 404 error for invalid event ID", async () => {
		const nonExistentId = uuidv4();

		const response = await request(app)
			.get(`/api/security/events/${nonExistentId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
	});

	it("should return correct error code", async () => {
		const nonExistentId = uuidv4();

		const response = await request(app)
			.get(`/api/security/events/${nonExistentId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("code");
		expect(response.body.code).toBe("EVENT_NOT_FOUND");
	});

	it("should return helpful error message", async () => {
		const nonExistentId = uuidv4();

		const response = await request(app)
			.get(`/api/security/events/${nonExistentId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
		expect(response.body.message.toLowerCase()).toContain("not found");
	});
});

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";
import { cleanupSecurityEvents } from "../../helpers/security-test-helper";

describe("RBAC Authorization - Single Permission Success", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create test context with specific permission
		context = await createAuthTestContext({
			roleName: "SECURITY_READER",
			rolePermissions: ["SECURITY:READ"],
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

	it("should allow access when user has required permission", async () => {
		const response = await request(app)
			.get("/api/security/events")
			.set("Authorization", `Bearer ${accessToken}`);

		// User has SECURITY:READ so should be allowed
		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
	});

	it("should deny access when user lacks required permission", async () => {
		// Try to access key rotation (requires SECURITY:MANAGE)
		const response = await request(app)
			.post("/api/security/keys/rotate")
			.set("Authorization", `Bearer ${accessToken}`);

		// User only has SECURITY:READ, not SECURITY:MANAGE
		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});

	it("should match permission format RESOURCE:ACTION exactly", async () => {
		// SECURITY:READ permission grants access to security events
		const response = await request(app)
			.get("/api/security/keys/status")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
	});

	it("should be case-sensitive for permission matching", async () => {
		// Create a context with lowercase permission to test case sensitivity
		const lowercaseContext = await createAuthTestContext({
			roleName: "LOWERCASE_TEST",
			rolePermissions: ["security:read"], // Lowercase - should not match
			createStaff: true,
		});

		const tokens = await lowercaseContext.issuePasswordTokens();

		const response = await request(app)
			.get("/api/security/events")
			.set("Authorization", `Bearer ${tokens.accessToken}`);

		// Should be denied since permission is lowercase
		expect(response.status).toBe(403);

		await lowercaseContext.cleanup();
	});

	it("should require authentication before authorization", async () => {
		const response = await request(app).get("/api/security/events");

		expect(response.status).toBe(401);
		expect(response.body.code).toBe("UNAUTHORIZED");
	});
});

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/hospitals/:id - SQL and NoSQL injection attempts", () => {
	let authContext: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create auth context with TENANT:READ permission
		authContext = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["TENANT:READ"],
		});

		// Get access token
		const tokens = await authContext.issuePasswordTokens();
		accessToken = tokens.accessToken;
	});

	afterAll(async () => {
		await authContext.cleanup();
	});

	it("should safely handle SQL injection attempt with OR 1=1", async () => {
		const sqlInjectionId = "' OR '1'='1";

		const response = await request(app)
			.get(`/api/hospitals/${encodeURIComponent(sqlInjectionId)}`)
			.set("Authorization", `Bearer ${accessToken}`);

		// Should not return data, should safely handle the injection
		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
	});

	it("should safely handle SQL injection with DROP TABLE", async () => {
		const sqlInjectionId = "'; DROP TABLE hospitals; --";

		const response = await request(app)
			.get(`/api/hospitals/${encodeURIComponent(sqlInjectionId)}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
	});

	it("should safely handle NoSQL injection with $ne operator", async () => {
		const noSqlInjectionId = JSON.stringify({ $ne: null });

		const response = await request(app)
			.get(`/api/hospitals/${encodeURIComponent(noSqlInjectionId)}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
	});

	it("should safely handle NoSQL injection with $gt operator", async () => {
		const noSqlInjectionId = JSON.stringify({ $gt: "" });

		const response = await request(app)
			.get(`/api/hospitals/${encodeURIComponent(noSqlInjectionId)}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
	});

	it("should safely handle NoSQL injection with regex", async () => {
		const noSqlInjectionId = JSON.stringify({ $regex: ".*" });

		const response = await request(app)
			.get(`/api/hospitals/${encodeURIComponent(noSqlInjectionId)}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
	});

	it("should safely handle JavaScript code injection", async () => {
		const jsInjectionId = "<script>alert('XSS')</script>";

		const response = await request(app)
			.get(`/api/hospitals/${encodeURIComponent(jsInjectionId)}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
	});

	it("should safely handle command injection attempt", async () => {
		const cmdInjectionId = "; ls -la";

		const response = await request(app)
			.get(`/api/hospitals/${encodeURIComponent(cmdInjectionId)}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
	});

	it("should safely handle path traversal attempt", async () => {
		const pathTraversalId = "../../../etc/passwd";

		const response = await request(app)
			.get(`/api/hospitals/${encodeURIComponent(pathTraversalId)}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
	});
});

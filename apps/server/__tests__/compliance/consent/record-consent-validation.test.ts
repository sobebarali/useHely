import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/compliance/consent - Record consent validation", () => {
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

	it("returns 400 when purpose is missing", async () => {
		const response = await request(app)
			.post("/api/compliance/consent")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				granted: true,
				source: "settings",
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when granted is missing", async () => {
		const response = await request(app)
			.post("/api/compliance/consent")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				purpose: "marketing_emails",
				source: "settings",
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 for invalid purpose value", async () => {
		const response = await request(app)
			.post("/api/compliance/consent")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				purpose: "invalid_purpose",
				granted: true,
				source: "settings",
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 for invalid source value", async () => {
		const response = await request(app)
			.post("/api/compliance/consent")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				purpose: "marketing_emails",
				granted: true,
				source: "invalid_source",
			});

		expect(response.status).toBe(400);
	});

	it("returns 400 when granted is not a boolean", async () => {
		const response = await request(app)
			.post("/api/compliance/consent")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				purpose: "marketing_emails",
				granted: "yes",
				source: "settings",
			});

		expect(response.status).toBe(400);
	});
});

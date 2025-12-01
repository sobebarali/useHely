import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/reports/:reportId/download - Not found", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["REPORT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 60000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 404 when report does not exist", async () => {
		const nonExistentReportId = `rpt_${uuidv4()}`;
		const response = await request(app)
			.get(`/api/reports/${nonExistentReportId}/download`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body.code).toBe("REPORT_NOT_FOUND");
	});

	it("returns 404 for malformed report ID", async () => {
		const response = await request(app)
			.get("/api/reports/invalid-id/download")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body.code).toBe("REPORT_NOT_FOUND");
	});

	it("returns 404 for empty report ID", async () => {
		const response = await request(app)
			.get("/api/reports//download")
			.set("Authorization", `Bearer ${accessToken}`);

		// Empty path segment typically returns 404
		expect(response.status).toBe(404);
	});
});

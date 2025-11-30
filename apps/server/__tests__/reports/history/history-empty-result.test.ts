import { Report } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/reports/history - Empty result", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["REPORT:CREATE", "REPORT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Clean up any existing reports for this tenant to ensure empty state
		await Report.deleteMany({ tenantId: context.hospitalId });
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns empty array when no reports exist", async () => {
		const response = await request(app)
			.get("/api/reports/history")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.status === 200 || response.status === 201).toBe(true);
		expect(response.body.data).toBeInstanceOf(Array);
		expect(response.body.data.length).toBe(0);
	});

	it("returns zero total in pagination when no reports exist", async () => {
		const response = await request(app)
			.get("/api/reports/history")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.pagination.total).toBe(0);
		expect(response.body.pagination.totalPages).toBe(0);
	});

	it("returns empty array when filtering for non-existent type", async () => {
		const response = await request(app)
			.get("/api/reports/history?reportType=appointment-summary")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toBeInstanceOf(Array);
		expect(response.body.data.length).toBe(0);
	});
});

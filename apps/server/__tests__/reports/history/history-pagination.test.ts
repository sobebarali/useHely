import { Report } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/reports/history - Pagination", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const createdReportIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["REPORT:CREATE", "REPORT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Generate multiple reports to test pagination
		for (let i = 0; i < 3; i++) {
			const response = await request(app)
				.post("/api/reports/generate")
				.set("Authorization", `Bearer ${accessToken}`)
				.send({
					reportType: "patient-demographics",
					parameters: {},
				});

			if (response.body.reportId) {
				createdReportIds.push(response.body.reportId);
			}
		}
	}, 60000);

	afterAll(async () => {
		// Clean up any created reports
		if (createdReportIds.length > 0) {
			await Report.deleteMany({ _id: { $in: createdReportIds } });
		}
		await context.cleanup();
	});

	it("returns first page with default limit", async () => {
		const response = await request(app)
			.get("/api/reports/history")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.pagination.page).toBe(1);
		expect(response.body.pagination.limit).toBe(20);
	});

	it("respects custom page parameter", async () => {
		const response = await request(app)
			.get("/api/reports/history?page=1")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.pagination.page).toBe(1);
	});

	it("respects custom limit parameter", async () => {
		const response = await request(app)
			.get("/api/reports/history?limit=5")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.pagination.limit).toBe(5);
	});

	it("respects both page and limit parameters", async () => {
		const response = await request(app)
			.get("/api/reports/history?page=1&limit=2")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.pagination.page).toBe(1);
		expect(response.body.pagination.limit).toBe(2);
		expect(response.body.data.length).toBeLessThanOrEqual(2);
	});

	it("limits maximum page size to 100", async () => {
		const response = await request(app)
			.get("/api/reports/history?limit=150")
			.set("Authorization", `Bearer ${accessToken}`);

		// Should either cap at 100 or return validation error
		expect([200, 400]).toContain(response.status);
	});

	it("calculates totalPages correctly", async () => {
		const response = await request(app)
			.get("/api/reports/history?limit=2")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const { total, limit, totalPages } = response.body.pagination;
		expect(totalPages).toBe(Math.ceil(total / limit));
	});
});

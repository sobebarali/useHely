import { Report } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/reports/history - Success", () => {
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

		// Generate a report first to have history
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
	}, 30000);

	afterAll(async () => {
		if (createdReportIds.length > 0) {
			await Report.deleteMany({ _id: { $in: createdReportIds } });
		}
		await context.cleanup();
	});

	it("returns history list with pagination", async () => {
		const response = await request(app)
			.get("/api/reports/history")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("data");
		expect(response.body).toHaveProperty("pagination");
		expect(response.body.data).toBeInstanceOf(Array);
	});

	it("returns correct pagination structure", async () => {
		const response = await request(app)
			.get("/api/reports/history")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const pagination = response.body.pagination;
		expect(pagination).toHaveProperty("page");
		expect(pagination).toHaveProperty("limit");
		expect(pagination).toHaveProperty("total");
		expect(pagination).toHaveProperty("totalPages");
	});

	it("returns history items with correct structure", async () => {
		const response = await request(app)
			.get("/api/reports/history")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		if (response.body.data.length > 0) {
			const historyItem = response.body.data[0];
			expect(historyItem).toHaveProperty("reportId");
			expect(historyItem).toHaveProperty("reportType");
			expect(historyItem).toHaveProperty("parameters");
			expect(historyItem).toHaveProperty("format");
			expect(historyItem).toHaveProperty("generatedBy");
			expect(historyItem).toHaveProperty("status");
		}
	});

	it("includes generated reports in history", async () => {
		const response = await request(app)
			.get("/api/reports/history")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.length).toBeGreaterThan(0);
	});
});

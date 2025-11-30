import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/reports - Returns correct format", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["REPORT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns reports with all required properties", async () => {
		const response = await request(app)
			.get("/api/reports")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const report = response.body.reports[0];

		expect(report).toHaveProperty("id");
		expect(report).toHaveProperty("name");
		expect(report).toHaveProperty("description");
		expect(report).toHaveProperty("category");
		expect(report).toHaveProperty("parameters");
		expect(report).toHaveProperty("formats");
		expect(report).toHaveProperty("requiredPermission");
	});

	it("returns valid categories", async () => {
		const response = await request(app)
			.get("/api/reports")
			.set("Authorization", `Bearer ${accessToken}`);

		const validCategories = [
			"PATIENT",
			"APPOINTMENT",
			"PRESCRIPTION",
			"OPERATIONAL",
		];
		const categories = response.body.reports.map(
			(r: { category: string }) => r.category,
		);

		for (const category of categories) {
			expect(validCategories).toContain(category);
		}
	});

	it("returns valid formats for each report", async () => {
		const response = await request(app)
			.get("/api/reports")
			.set("Authorization", `Bearer ${accessToken}`);

		const validFormats = ["json", "csv", "pdf", "xlsx"];

		for (const report of response.body.reports) {
			expect(report.formats).toBeInstanceOf(Array);
			expect(report.formats.length).toBeGreaterThan(0);

			for (const format of report.formats) {
				expect(validFormats).toContain(format);
			}
		}
	});

	it("returns parameters with correct structure", async () => {
		const response = await request(app)
			.get("/api/reports")
			.set("Authorization", `Bearer ${accessToken}`);

		for (const report of response.body.reports) {
			expect(report.parameters).toBeInstanceOf(Array);

			for (const param of report.parameters) {
				expect(param).toHaveProperty("name");
				expect(param).toHaveProperty("type");
				expect(param).toHaveProperty("required");
				expect(param).toHaveProperty("description");
			}
		}
	});
});

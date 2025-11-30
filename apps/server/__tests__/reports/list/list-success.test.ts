import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/reports - Success", () => {
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

	it("returns all available report types", async () => {
		const response = await request(app)
			.get("/api/reports")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.reports).toBeDefined();
		expect(response.body.reports).toBeInstanceOf(Array);
		expect(response.body.reports.length).toBe(8);
	});

	it("returns correct report type IDs", async () => {
		const response = await request(app)
			.get("/api/reports")
			.set("Authorization", `Bearer ${accessToken}`);

		const reportIds = response.body.reports.map((r: { id: string }) => r.id);

		expect(reportIds).toContain("patient-registration");
		expect(reportIds).toContain("patient-demographics");
		expect(reportIds).toContain("appointment-summary");
		expect(reportIds).toContain("doctor-performance");
		expect(reportIds).toContain("prescription-summary");
		expect(reportIds).toContain("medicine-usage");
		expect(reportIds).toContain("department-utilization");
		expect(reportIds).toContain("staff-summary");
	});
});

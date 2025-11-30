import { Report } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/reports/:reportId/download - Wrong tenant", () => {
	let context1: AuthTestContext;
	let context2: AuthTestContext;
	let accessToken2: string;
	let reportFromTenant1: string;

	beforeAll(async () => {
		// Create first tenant and generate a report
		context1 = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["REPORT:CREATE", "REPORT:READ"],
		});

		const tokens1 = await context1.issuePasswordTokens();

		// Generate a report in tenant 1
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${tokens1.accessToken}`)
			.send({
				reportType: "patient-demographics",
				parameters: {},
			});

		reportFromTenant1 = response.body.reportId;

		// Create second tenant (different hospital)
		context2 = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["REPORT:CREATE", "REPORT:READ"],
		});

		const tokens2 = await context2.issuePasswordTokens();
		accessToken2 = tokens2.accessToken;
	}, 60000);

	afterAll(async () => {
		if (reportFromTenant1) {
			await Report.deleteOne({ _id: reportFromTenant1 });
		}
		await context1.cleanup();
		await context2.cleanup();
	});

	it("returns 404 when trying to access report from another tenant", async () => {
		const response = await request(app)
			.get(`/api/reports/${reportFromTenant1}/download`)
			.set("Authorization", `Bearer ${accessToken2}`);

		expect(response.status).toBe(404);
		expect(response.body.code).toBe("REPORT_NOT_FOUND");
	});

	it("cannot list reports from another tenant in history", async () => {
		const response = await request(app)
			.get("/api/reports/history")
			.set("Authorization", `Bearer ${accessToken2}`);

		expect(response.status).toBe(200);

		// The report from tenant 1 should not be visible to tenant 2
		const reportIds = response.body.data.map(
			(r: { reportId: string }) => r.reportId,
		);
		expect(reportIds).not.toContain(reportFromTenant1);
	});
});

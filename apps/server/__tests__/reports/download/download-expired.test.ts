import { Report, ReportStatus } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/reports/:reportId/download - Expired", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let expiredReportId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["REPORT:CREATE", "REPORT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create an expired report directly in the database
		expiredReportId = `rpt_${uuidv4()}`;
		const pastDate = new Date();
		pastDate.setDate(pastDate.getDate() - 10); // 10 days ago

		await Report.create({
			_id: expiredReportId,
			tenantId: context.hospitalId,
			reportType: "patient-demographics",
			category: "PATIENT",
			status: ReportStatus.COMPLETED,
			format: "json",
			parameters: {},
			data: { totalPatients: 0 },
			summary: { totalPatients: 0 },
			generatedBy: { id: context.staffId, name: "Test User" },
			generatedAt: pastDate,
			expiresAt: pastDate, // Expired 10 days ago
		});
	}, 30000);

	afterAll(async () => {
		if (expiredReportId) {
			await Report.deleteOne({ _id: expiredReportId });
		}
		await context.cleanup();
	});

	it("returns 410 with REPORT_EXPIRED code for expired report", async () => {
		const response = await request(app)
			.get(`/api/reports/${expiredReportId}/download`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(410);
		expect(response.body.code).toBe("REPORT_EXPIRED");
	});
});

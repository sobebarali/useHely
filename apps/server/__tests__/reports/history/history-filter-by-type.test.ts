import { Report } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/reports/history - Filter by type", () => {
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

		// Generate different report types
		const demographicsResponse = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-demographics",
				parameters: {},
			});

		if (demographicsResponse.body.reportId) {
			createdReportIds.push(demographicsResponse.body.reportId);
		}

		const registrationResponse = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-registration",
				parameters: {
					startDate: "2024-01-01",
					endDate: "2024-01-31",
				},
			});

		if (registrationResponse.body.reportId) {
			createdReportIds.push(registrationResponse.body.reportId);
		}
	}, 60000);

	afterAll(async () => {
		// Clean up any created reports
		if (createdReportIds.length > 0) {
			await Report.deleteMany({ _id: { $in: createdReportIds } });
		}
		await context.cleanup();
	});

	it("filters history by report type", async () => {
		const response = await request(app)
			.get("/api/reports/history?reportType=patient-demographics")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toBeInstanceOf(Array);

		for (const item of response.body.data) {
			expect(item.reportType).toBe("patient-demographics");
		}
	});

	it("filters history by patient-registration type", async () => {
		const response = await request(app)
			.get("/api/reports/history?reportType=patient-registration")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toBeInstanceOf(Array);

		for (const item of response.body.data) {
			expect(item.reportType).toBe("patient-registration");
		}
	});

	it("returns all types when no filter applied", async () => {
		const response = await request(app)
			.get("/api/reports/history")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.length).toBeGreaterThanOrEqual(2);
	});
});

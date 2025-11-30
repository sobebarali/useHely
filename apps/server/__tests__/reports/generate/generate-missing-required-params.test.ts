import { Report } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/reports/generate - Missing required params", () => {
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
	}, 30000);

	afterAll(async () => {
		// Clean up any created reports
		if (createdReportIds.length > 0) {
			await Report.deleteMany({ _id: { $in: createdReportIds } });
		}
		await context.cleanup();
	});

	it("returns 400 when startDate is missing for patient-registration", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-registration",
				parameters: {
					endDate: "2024-01-31",
				},
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("MISSING_PARAMETERS");
	});

	it("returns 400 when endDate is missing for patient-registration", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "patient-registration",
				parameters: {
					startDate: "2024-01-01",
				},
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("MISSING_PARAMETERS");
	});

	it("returns 400 when both dates are missing for appointment-summary", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "appointment-summary",
				parameters: {},
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("MISSING_PARAMETERS");
	});

	it("returns 400 when dates are missing for prescription-summary", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "prescription-summary",
				parameters: {},
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("MISSING_PARAMETERS");
	});

	it("returns 400 when dates are missing for doctor-performance", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "doctor-performance",
				parameters: {},
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("MISSING_PARAMETERS");
	});

	it("returns 400 when dates are missing for medicine-usage", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "medicine-usage",
				parameters: {},
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("MISSING_PARAMETERS");
	});

	it("returns 400 when dates are missing for department-utilization", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "department-utilization",
				parameters: {},
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("MISSING_PARAMETERS");
	});

	it("returns 400 when dates are missing for staff-summary", async () => {
		const response = await request(app)
			.post("/api/reports/generate")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				reportType: "staff-summary",
				parameters: {},
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("MISSING_PARAMETERS");
	});
});

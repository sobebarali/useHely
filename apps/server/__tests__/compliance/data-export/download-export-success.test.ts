import { DataSubjectRequest } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/compliance/data-export/:requestId/download - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let exportRequestId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: [],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create an export request (processed synchronously)
		const exportResponse = await request(app)
			.post("/api/compliance/data-export")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				format: "json",
				includeAuditLog: true,
			});

		exportRequestId = exportResponse.body.data.requestId;
	}, 30000);

	afterAll(async () => {
		if (exportRequestId) {
			await DataSubjectRequest.deleteOne({ _id: exportRequestId });
		}
		await context.cleanup();
	});

	it("downloads completed JSON export successfully", async () => {
		const response = await request(app)
			.get(`/api/compliance/data-export/${exportRequestId}/download`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toHaveProperty("exportData");
	});
});

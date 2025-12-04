import {
	DataSubjectRequest,
	DataSubjectRequestStatus,
	DataSubjectRequestType,
} from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
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

		// Create a completed export request directly in DB
		// (Since exports are processed async via BullMQ, we simulate a completed export)
		const downloadExpiry = new Date();
		downloadExpiry.setDate(downloadExpiry.getDate() + 30);

		exportRequestId = uuidv4();

		await DataSubjectRequest.create({
			_id: exportRequestId,
			tenantId: context.hospitalId,
			userId: context.userId,
			userEmail: context.email,
			type: DataSubjectRequestType.EXPORT,
			status: DataSubjectRequestStatus.COMPLETED,
			format: "json",
			includeAuditLog: true,
			downloadUrl:
				"https://example.r2.cloudflarestorage.com/exports/test-export.json",
			downloadExpiry,
			completedAt: new Date(),
		});
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
			.set("Authorization", `Bearer ${accessToken}`)
			.redirects(0); // Don't follow redirects

		// When R2 is configured, the endpoint redirects to a presigned URL
		expect(response.status).toBe(302);
		expect(response.headers.location).toBeDefined();
		expect(response.headers.location).toMatch(/r2\.cloudflarestorage\.com/);
	});
});

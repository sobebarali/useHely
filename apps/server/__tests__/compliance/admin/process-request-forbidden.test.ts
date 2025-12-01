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

describe("PUT /api/compliance/requests/:requestId/process - Forbidden", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let requestId: string;

	beforeAll(async () => {
		// Create user without COMPLIANCE:MANAGE permission
		context = await createAuthTestContext({
			rolePermissions: ["COMPLIANCE:READ"], // Has read but not manage
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create a request to try to process
		requestId = uuidv4();
		await DataSubjectRequest.create({
			_id: requestId,
			tenantId: context.hospitalId,
			userId: context.userId,
			userEmail: context.email,
			type: DataSubjectRequestType.EXPORT,
			status: DataSubjectRequestStatus.PENDING,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await DataSubjectRequest.deleteOne({ _id: requestId });
		await context.cleanup();
	});

	it("returns 403 when user lacks COMPLIANCE:MANAGE permission", async () => {
		const response = await request(app)
			.put(`/api/compliance/requests/${requestId}/process`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				action: "approve",
			});

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});
});

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

describe("PUT /api/compliance/requests/:requestId/process - Invalid action for status", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let completedRequestId: string;
	let cancelledRequestId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["COMPLIANCE:MANAGE"],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create a completed request (cannot be processed)
		completedRequestId = uuidv4();
		await DataSubjectRequest.create({
			_id: completedRequestId,
			tenantId: context.hospitalId,
			userId: context.userId,
			userEmail: context.email,
			type: DataSubjectRequestType.EXPORT,
			status: DataSubjectRequestStatus.COMPLETED,
			completedAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Create a cancelled request (cannot be processed)
		cancelledRequestId = uuidv4();
		await DataSubjectRequest.create({
			_id: cancelledRequestId,
			tenantId: context.hospitalId,
			userId: context.userId,
			userEmail: context.email,
			type: DataSubjectRequestType.DELETION,
			status: DataSubjectRequestStatus.CANCELLED,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await DataSubjectRequest.deleteOne({ _id: completedRequestId });
		await DataSubjectRequest.deleteOne({ _id: cancelledRequestId });
		await context.cleanup();
	});

	it("returns 400 when trying to process a completed request", async () => {
		const response = await request(app)
			.put(`/api/compliance/requests/${completedRequestId}/process`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				action: "approve",
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBeDefined();
	});

	it("returns 400 when trying to process a cancelled request", async () => {
		const response = await request(app)
			.put(`/api/compliance/requests/${cancelledRequestId}/process`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				action: "expedite",
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBeDefined();
	});
});

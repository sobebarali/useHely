import { AuditExport, AuditLog } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/audit/export - CSV Format", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const createdLogIds: string[] = [];
	let createdExportId: string | undefined;

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:EXPORT"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create test audit logs for export
		for (let i = 0; i < 3; i++) {
			const logId = uuidv4();
			await AuditLog.create({
				_id: logId,
				tenantId: context.hospitalId,
				eventType: "PHI_VIEW",
				category: "PHI",
				userId: context.userId,
				userName: "Test User",
				resourceType: "patient",
				resourceId: uuidv4(),
				action: "READ",
				ip: "192.168.1.1",
				hash: `test-hash-${i}`,
				previousHash: i === 0 ? "GENESIS" : `test-hash-${i - 1}`,
				timestamp: new Date(Date.now() - i * 60000),
			});
			createdLogIds.push(logId);
		}
	}, 30000);

	afterAll(async () => {
		for (const logId of createdLogIds) {
			await AuditLog.deleteOne({ _id: logId });
		}
		if (createdExportId) {
			await AuditExport.deleteOne({ _id: createdExportId });
		}
		await context.cleanup();
	});

	it("creates export job with CSV format", async () => {
		const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const endDate = new Date().toISOString();

		const response = await request(app)
			.post("/api/audit/export")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				startDate,
				endDate,
				format: "csv",
			});

		expect(response.status).toBe(202);
		expect(response.body.success).toBe(true);
		expect(response.body.data.exportId).toBeDefined();
		// Export is now processed synchronously, status will be COMPLETED (or FAILED if error)
		expect(["PENDING", "COMPLETED"]).toContain(response.body.data.status);

		createdExportId = response.body.data.exportId;
	});
});

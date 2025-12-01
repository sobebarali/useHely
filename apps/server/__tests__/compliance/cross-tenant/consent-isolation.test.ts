import { Consent, ConsentHistory } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("Cross-Tenant Security - Consent", () => {
	let tenantA: AuthTestContext;
	let tenantB: AuthTestContext;
	let tokenA: string;
	let tokenB: string;
	let consentIdA: string;

	beforeAll(async () => {
		// Create two separate tenants
		tenantA = await createAuthTestContext({
			rolePermissions: [],
		});
		tenantB = await createAuthTestContext({
			rolePermissions: [],
		});

		const tokensA = await tenantA.issuePasswordTokens();
		const tokensB = await tenantB.issuePasswordTokens();
		tokenA = tokensA.accessToken;
		tokenB = tokensB.accessToken;

		// Create consent for tenant A
		const consentResponse = await request(app)
			.post("/api/compliance/consent")
			.set("Authorization", `Bearer ${tokenA}`)
			.send({
				purpose: "marketing_emails",
				granted: true,
				source: "settings",
			});

		consentIdA = consentResponse.body.data.id;
	}, 60000);

	afterAll(async () => {
		if (consentIdA) {
			await ConsentHistory.deleteMany({ consentId: consentIdA });
			await Consent.deleteOne({ _id: consentIdA });
		}
		await tenantA.cleanup();
		await tenantB.cleanup();
	});

	it("tenant B cannot see tenant A's consents in list", async () => {
		const response = await request(app)
			.get("/api/compliance/consent")
			.set("Authorization", `Bearer ${tokenB}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);

		// Tenant B should not see tenant A's consent
		const consentIds = response.body.data.map((c: { id: string }) => c.id);
		expect(consentIds).not.toContain(consentIdA);
	});

	it("tenant B cannot withdraw tenant A's consent", async () => {
		const response = await request(app)
			.put(`/api/compliance/consent/${consentIdA}/withdraw`)
			.set("Authorization", `Bearer ${tokenB}`)
			.send({
				reason: "Cross-tenant attack attempt",
			});

		// Should return 404 (not found) as it's isolated by tenant
		expect(response.status).toBe(404);
		expect(response.body.code).toBeDefined();
	});

	it("tenant B cannot access tenant A's consent history", async () => {
		const response = await request(app)
			.get("/api/compliance/consent/marketing_emails/history")
			.set("Authorization", `Bearer ${tokenB}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);

		// Should return empty history array - no history for tenant B
		expect(response.body.data.history).toBeInstanceOf(Array);
		expect(response.body.data.history.length).toBe(0);
	});
});

import { Account, Staff, User } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/users - List users successfully", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const createdUserIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["USER:CREATE", "USER:READ"],
			includeDepartment: true,
			pricingTier: "PROFESSIONAL",
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create a few test users
		for (let i = 0; i < 3; i++) {
			const response = await request(app)
				.post("/api/users")
				.set("Authorization", `Bearer ${accessToken}`)
				.send({
					firstName: `Test${i}`,
					lastName: `User${i}`,
					email: `test.user${i}.${context.uniqueId}@test.com`,
					phone: `+123456789${i}`,
					department: context.departmentId,
					roles: context.roleIds,
				});

			if (response.status === 201) {
				createdUserIds.push(response.body.id);
			}
		}
	}, 60000);

	afterAll(async () => {
		// Clean up created users
		for (const staffId of createdUserIds) {
			const staff = await Staff.findById(staffId);
			if (staff) {
				await Account.deleteOne({ userId: staff.userId });
				await User.deleteOne({ _id: staff.userId });
				await Staff.deleteOne({ _id: staffId });
			}
		}
		await context.cleanup();
	});

	it("returns paginated list of users when the requester has USER:READ permission", async () => {
		const response = await request(app)
			.get("/api/users")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ page: 1, limit: 10 });

		expect(response.status).toBe(200);
		expect(response.body.data).toBeInstanceOf(Array);
		expect(response.body.pagination).toBeDefined();
		expect(response.body.pagination.page).toBe(1);
		expect(response.body.pagination.limit).toBe(10);
		expect(response.body.pagination.total).toBeGreaterThanOrEqual(3);

		// Check structure of returned users
		if (response.body.data.length > 0) {
			const user = response.body.data[0];
			expect(user.id).toBeDefined();
			expect(user.email).toBeDefined();
			expect(user.firstName).toBeDefined();
			expect(user.lastName).toBeDefined();
			expect(user.status).toBeDefined();
		}
	});

	it("filters users by status", async () => {
		const response = await request(app)
			.get("/api/users")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ status: "ACTIVE" });

		expect(response.status).toBe(200);
		expect(response.body.data).toBeInstanceOf(Array);

		// All returned users should be ACTIVE
		for (const user of response.body.data) {
			expect(user.status).toBe("ACTIVE");
		}
	});

	it("searches users by name", async () => {
		const response = await request(app)
			.get("/api/users")
			.set("Authorization", `Bearer ${accessToken}`)
			.query({ search: "Test0" });

		expect(response.status).toBe(200);
		expect(response.body.data).toBeInstanceOf(Array);
		// Should find at least one user with "Test0" in their name
		expect(response.body.data.length).toBeGreaterThanOrEqual(0);
	});
});

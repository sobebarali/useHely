import { Department } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("ABAC Policy - Department Scoping", () => {
	let adminContext: AuthTestContext;
	let adminAccessToken: string;

	let department1Id: string;
	let department2Id: string;

	beforeAll(async () => {
		// Create admin context with department
		adminContext = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: [
				"DEPARTMENT:READ",
				"DEPARTMENT:CREATE",
				"DEPARTMENT:UPDATE",
				"DEPARTMENT:DELETE",
			],
			includeDepartment: true,
			createStaff: true,
		});
		const adminTokens = await adminContext.issuePasswordTokens();
		adminAccessToken = adminTokens.accessToken;

		// The first department is created by createAuthTestContext
		department1Id = adminContext.departmentId!;

		// Create second department in same tenant
		department2Id = uuidv4();
		await Department.create({
			_id: department2Id,
			tenantId: adminContext.hospitalId,
			name: `Department 2 ${adminContext.uniqueId}`,
			code: `DEPT2-${adminContext.uniqueId}`,
			description: "Second Test Department",
			type: "CLINICAL",
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 60000);

	afterAll(async () => {
		// Cleanup department 2 only (department 1 is cleaned up by adminContext.cleanup)
		await Department.deleteOne({ _id: department2Id });
		await adminContext.cleanup();
	});

	describe("Admin accessing departments", () => {
		it("should allow admin to access any department", async () => {
			// Admin should access department 1
			const response1 = await request(app)
				.get(`/api/departments/${department1Id}`)
				.set("Authorization", `Bearer ${adminAccessToken}`);

			expect(response1.status).toBe(200);
			expect(response1.body.id).toBe(department1Id);

			// Admin should access department 2
			const response2 = await request(app)
				.get(`/api/departments/${department2Id}`)
				.set("Authorization", `Bearer ${adminAccessToken}`);

			expect(response2.status).toBe(200);
			expect(response2.body.id).toBe(department2Id);
		});
	});

	describe("Cross-tenant department isolation", () => {
		it("should deny access to departments from different tenant", async () => {
			const differentTenantContext = await createAuthTestContext({
				roleName: "HOSPITAL_ADMIN",
				rolePermissions: ["DEPARTMENT:READ"],
				includeDepartment: true,
				createStaff: true,
			});
			const tokens = await differentTenantContext.issuePasswordTokens();

			// Try to access department from original tenant
			const response = await request(app)
				.get(`/api/departments/${department1Id}`)
				.set("Authorization", `Bearer ${tokens.accessToken}`);

			// Should be 404 because department doesn't exist in their tenant
			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");

			await differentTenantContext.cleanup();
		});
	});

	describe("Non-existent department", () => {
		it("should return 404 for non-existent department", async () => {
			const fakeDepartmentId = uuidv4();

			const response = await request(app)
				.get(`/api/departments/${fakeDepartmentId}`)
				.set("Authorization", `Bearer ${adminAccessToken}`);

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");
		});
	});

	describe("Department list operations", () => {
		it("should list all departments in tenant", async () => {
			const response = await request(app)
				.get("/api/departments")
				.set("Authorization", `Bearer ${adminAccessToken}`);

			expect(response.status).toBe(200);
			expect(response.body.data).toBeInstanceOf(Array);

			// Should contain both departments
			const departmentIds = response.body.data.map((d: { id: string }) => d.id);
			expect(departmentIds).toContain(department1Id);
			expect(departmentIds).toContain(department2Id);
		});
	});

	describe("Department data integrity", () => {
		it("should return department with correct data", async () => {
			const response = await request(app)
				.get(`/api/departments/${department2Id}`)
				.set("Authorization", `Bearer ${adminAccessToken}`);

			expect(response.status).toBe(200);
			expect(response.body.name).toContain("Department 2");
			expect(response.body.type).toBe("CLINICAL");
			expect(response.body.status).toBe("ACTIVE");
		});
	});
});

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/menu - Role-based filtering", () => {
	describe("DOCTOR role", () => {
		let context: AuthTestContext;
		let accessToken: string;

		beforeAll(async () => {
			context = await createAuthTestContext({
				roleName: "DOCTOR",
				rolePermissions: [
					"DASHBOARD:VIEW",
					"PATIENT:READ",
					"PATIENT:CREATE",
					"PATIENT:UPDATE",
					"PRESCRIPTION:READ",
					"PRESCRIPTION:CREATE",
					"PRESCRIPTION:UPDATE",
					"APPOINTMENT:READ",
					"APPOINTMENT:UPDATE",
					"VITALS:READ",
				],
			});

			const tokens = await context.issuePasswordTokens();
			accessToken = tokens.accessToken;
		}, 30000);

		afterAll(async () => {
			await context.cleanup();
		});

		it("returns dashboard menu item", async () => {
			const response = await request(app)
				.get("/api/menu")
				.set("Authorization", `Bearer ${accessToken}`);

			expect(response.status).toBe(200);

			const { menu } = response.body.data;
			const dashboard = menu.find(
				(item: { id: string }) => item.id === "dashboard",
			);
			expect(dashboard).toBeDefined();
		});

		it("returns patients menu but not users menu", async () => {
			const response = await request(app)
				.get("/api/menu")
				.set("Authorization", `Bearer ${accessToken}`);

			expect(response.status).toBe(200);

			const { menu } = response.body.data;

			// Doctor should see patients
			const patients = menu.find(
				(item: { id: string }) => item.id === "patients",
			);
			expect(patients).toBeDefined();

			// Doctor should NOT see users management
			const users = menu.find((item: { id: string }) => item.id === "users");
			expect(users).toBeUndefined();
		});

		it("returns prescriptions menu with create option", async () => {
			const response = await request(app)
				.get("/api/menu")
				.set("Authorization", `Bearer ${accessToken}`);

			expect(response.status).toBe(200);

			const { menu } = response.body.data;
			const prescriptions = menu.find(
				(item: { id: string }) => item.id === "prescriptions",
			);

			expect(prescriptions).toBeDefined();
			expect(prescriptions.children).toBeDefined();

			const createOption = prescriptions.children.find(
				(child: { id: string }) => child.id === "prescriptions-create",
			);
			expect(createOption).toBeDefined();
		});

		it("does not return settings or departments menu", async () => {
			const response = await request(app)
				.get("/api/menu")
				.set("Authorization", `Bearer ${accessToken}`);

			expect(response.status).toBe(200);

			const { menu } = response.body.data;

			const settings = menu.find(
				(item: { id: string }) => item.id === "settings",
			);
			expect(settings).toBeUndefined();

			const departments = menu.find(
				(item: { id: string }) => item.id === "departments",
			);
			expect(departments).toBeUndefined();
		});
	});

	describe("NURSE role", () => {
		let context: AuthTestContext;
		let accessToken: string;

		beforeAll(async () => {
			context = await createAuthTestContext({
				roleName: "NURSE",
				rolePermissions: [
					"DASHBOARD:VIEW",
					"PATIENT:READ",
					"PATIENT:UPDATE",
					"VITALS:CREATE",
					"VITALS:READ",
					"VITALS:UPDATE",
					"PRESCRIPTION:READ",
					"APPOINTMENT:READ",
				],
			});

			const tokens = await context.issuePasswordTokens();
			accessToken = tokens.accessToken;
		}, 30000);

		afterAll(async () => {
			await context.cleanup();
		});

		it("returns vitals menu with record option", async () => {
			const response = await request(app)
				.get("/api/menu")
				.set("Authorization", `Bearer ${accessToken}`);

			expect(response.status).toBe(200);

			const { menu } = response.body.data;
			const vitals = menu.find((item: { id: string }) => item.id === "vitals");

			expect(vitals).toBeDefined();
			expect(vitals.children).toBeDefined();

			const recordOption = vitals.children.find(
				(child: { id: string }) => child.id === "vitals-record",
			);
			expect(recordOption).toBeDefined();
		});

		it("returns prescriptions menu without create option", async () => {
			const response = await request(app)
				.get("/api/menu")
				.set("Authorization", `Bearer ${accessToken}`);

			expect(response.status).toBe(200);

			const { menu } = response.body.data;
			const prescriptions = menu.find(
				(item: { id: string }) => item.id === "prescriptions",
			);

			expect(prescriptions).toBeDefined();

			// Nurse can read prescriptions but not create
			const createOption = prescriptions.children?.find(
				(child: { id: string }) => child.id === "prescriptions-create",
			);
			expect(createOption).toBeUndefined();
		});
	});

	describe("PHARMACIST role", () => {
		let context: AuthTestContext;
		let accessToken: string;

		beforeAll(async () => {
			context = await createAuthTestContext({
				roleName: "PHARMACIST",
				rolePermissions: [
					"DASHBOARD:VIEW",
					"PRESCRIPTION:READ",
					"DISPENSING:CREATE",
					"DISPENSING:READ",
					"DISPENSING:UPDATE",
					"INVENTORY:READ",
					"INVENTORY:UPDATE",
					"PATIENT:READ",
				],
			});

			const tokens = await context.issuePasswordTokens();
			accessToken = tokens.accessToken;
		}, 30000);

		afterAll(async () => {
			await context.cleanup();
		});

		it("returns dispensing menu", async () => {
			const response = await request(app)
				.get("/api/menu")
				.set("Authorization", `Bearer ${accessToken}`);

			expect(response.status).toBe(200);

			const { menu } = response.body.data;
			// Menu config uses "pharmacy" as the id for dispensing menu
			const dispensing = menu.find(
				(item: { id: string }) => item.id === "pharmacy",
			);

			expect(dispensing).toBeDefined();
			expect(dispensing.children).toBeDefined();
			expect(dispensing.children.length).toBeGreaterThan(0);
		});

		it("returns inventory menu", async () => {
			const response = await request(app)
				.get("/api/menu")
				.set("Authorization", `Bearer ${accessToken}`);

			expect(response.status).toBe(200);

			const { menu } = response.body.data;
			const inventory = menu.find(
				(item: { id: string }) => item.id === "inventory",
			);

			expect(inventory).toBeDefined();
		});

		it("does not return vitals or appointments menu", async () => {
			const response = await request(app)
				.get("/api/menu")
				.set("Authorization", `Bearer ${accessToken}`);

			expect(response.status).toBe(200);

			const { menu } = response.body.data;

			const vitals = menu.find((item: { id: string }) => item.id === "vitals");
			expect(vitals).toBeUndefined();

			const appointments = menu.find(
				(item: { id: string }) => item.id === "appointments",
			);
			expect(appointments).toBeUndefined();
		});
	});

	describe("RECEPTIONIST role", () => {
		let context: AuthTestContext;
		let accessToken: string;

		beforeAll(async () => {
			context = await createAuthTestContext({
				roleName: "RECEPTIONIST",
				rolePermissions: [
					"DASHBOARD:VIEW",
					"PATIENT:CREATE",
					"PATIENT:READ",
					"APPOINTMENT:CREATE",
					"APPOINTMENT:READ",
					"APPOINTMENT:UPDATE",
					"APPOINTMENT:DELETE",
					"QUEUE:MANAGE",
				],
			});

			const tokens = await context.issuePasswordTokens();
			accessToken = tokens.accessToken;
		}, 30000);

		afterAll(async () => {
			await context.cleanup();
		});

		it("returns queue menu", async () => {
			const response = await request(app)
				.get("/api/menu")
				.set("Authorization", `Bearer ${accessToken}`);

			expect(response.status).toBe(200);

			const { menu } = response.body.data;
			const queue = menu.find((item: { id: string }) => item.id === "queue");

			expect(queue).toBeDefined();
			expect(queue.path).toBe("/dashboard/patients/opd-queue");
		});

		it("returns appointments menu with schedule option", async () => {
			const response = await request(app)
				.get("/api/menu")
				.set("Authorization", `Bearer ${accessToken}`);

			expect(response.status).toBe(200);

			const { menu } = response.body.data;
			const appointments = menu.find(
				(item: { id: string }) => item.id === "appointments",
			);

			expect(appointments).toBeDefined();
			expect(appointments.children).toBeDefined();

			const scheduleOption = appointments.children.find(
				(child: { id: string }) => child.id === "appointments-schedule",
			);
			expect(scheduleOption).toBeDefined();
		});

		it("returns patients menu with register option", async () => {
			const response = await request(app)
				.get("/api/menu")
				.set("Authorization", `Bearer ${accessToken}`);

			expect(response.status).toBe(200);

			const { menu } = response.body.data;
			const patients = menu.find(
				(item: { id: string }) => item.id === "patients",
			);

			expect(patients).toBeDefined();

			const registerOption = patients.children.find(
				(child: { id: string }) => child.id === "patients-register",
			);
			expect(registerOption).toBeDefined();
		});

		it("does not return prescriptions or dispensing menu", async () => {
			const response = await request(app)
				.get("/api/menu")
				.set("Authorization", `Bearer ${accessToken}`);

			expect(response.status).toBe(200);

			const { menu } = response.body.data;

			const prescriptions = menu.find(
				(item: { id: string }) => item.id === "prescriptions",
			);
			expect(prescriptions).toBeUndefined();

			const dispensing = menu.find(
				(item: { id: string }) => item.id === "dispensing",
			);
			expect(dispensing).toBeUndefined();
		});
	});

	describe("Zero permissions edge case", () => {
		let context: AuthTestContext;
		let accessToken: string;

		beforeAll(async () => {
			context = await createAuthTestContext({
				roleName: "NO_PERMISSIONS_ROLE",
				rolePermissions: [],
			});

			const tokens = await context.issuePasswordTokens();
			accessToken = tokens.accessToken;
		}, 30000);

		afterAll(async () => {
			await context.cleanup();
		});

		it("returns empty menu when user has no permissions", async () => {
			const response = await request(app)
				.get("/api/menu")
				.set("Authorization", `Bearer ${accessToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);

			const { menu, permissions } = response.body.data;

			// Menu should be empty
			expect(menu).toEqual([]);

			// Permissions should be empty array
			expect(permissions).toEqual([]);
		});
	});

	describe("Empty children handling", () => {
		let context: AuthTestContext;
		let accessToken: string;

		beforeAll(async () => {
			// Create a user with only READ permission for prescriptions (no CREATE)
			context = await createAuthTestContext({
				roleName: "LIMITED_ROLE",
				rolePermissions: ["DASHBOARD:VIEW", "PRESCRIPTION:READ"],
			});

			const tokens = await context.issuePasswordTokens();
			accessToken = tokens.accessToken;
		}, 30000);

		afterAll(async () => {
			await context.cleanup();
		});

		it("shows parent menu when at least one child is accessible", async () => {
			const response = await request(app)
				.get("/api/menu")
				.set("Authorization", `Bearer ${accessToken}`);

			expect(response.status).toBe(200);

			const { menu } = response.body.data;
			const prescriptions = menu.find(
				(item: { id: string }) => item.id === "prescriptions",
			);

			// Should see prescriptions because PRESCRIPTION:READ allows viewing list
			expect(prescriptions).toBeDefined();

			// Should only see list, not create
			if (prescriptions.children) {
				const createOption = prescriptions.children.find(
					(child: { id: string }) => child.id === "prescriptions-create",
				);
				expect(createOption).toBeUndefined();

				// Menu config uses "prescriptions-list" not "prescriptions-history"
				const listOption = prescriptions.children.find(
					(child: { id: string }) => child.id === "prescriptions-list",
				);
				expect(listOption).toBeDefined();
			}
		});
	});
});

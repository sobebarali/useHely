import {
	SecurityEvent,
	SecurityEventSeverity,
	SecurityEventType,
} from "@hms/db";
import { describe, expect, it } from "vitest";
import { app } from "../../src/index"; // Import app to ensure DB connection
import { emitSecurityEvent } from "../../src/utils/security-events";

// Ensure app is loaded (triggers DB connection)
if (!app) {
	throw new Error("App not loaded");
}

describe("Security Events Utility", () => {
	it("emits a security event successfully", async () => {
		const testParams = {
			type: SecurityEventType.AUTH_FAILED,
			severity: SecurityEventSeverity.MEDIUM,
			tenantId: "test-tenant-id",
			userId: "test-user-id",
			ip: "192.168.1.1",
			userAgent: "Mozilla/5.0",
			details: { reason: "Invalid token" },
		};

		// Emit the event
		emitSecurityEvent(testParams);

		// Wait a bit for async operation to complete
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Verify event was created in database
		const events = await SecurityEvent.find({
			type: SecurityEventType.AUTH_FAILED,
			tenantId: testParams.tenantId,
		}).lean();

		expect(events.length).toBeGreaterThan(0);

		const event = events[0];
		expect(event).toBeDefined();
		if (!event) return; // Type guard

		expect(event.type).toBe(SecurityEventType.AUTH_FAILED);
		expect(event.severity).toBe(SecurityEventSeverity.MEDIUM);
		expect(event.tenantId).toBe(testParams.tenantId);
		expect(event.userId).toBe(testParams.userId);
		expect(event.ip).toBe(testParams.ip);
		expect(event.userAgent).toBe(testParams.userAgent);
		expect(event.details).toEqual(testParams.details);

		// Cleanup
		await SecurityEvent.deleteMany({ _id: event._id });
	});

	it("emits event without optional fields", async () => {
		const testParams = {
			type: SecurityEventType.KEY_ROTATION,
			severity: SecurityEventSeverity.LOW,
		};

		// Emit the event
		emitSecurityEvent(testParams);

		// Wait for async operation
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Verify event was created
		const events = await SecurityEvent.find({
			type: SecurityEventType.KEY_ROTATION,
		})
			.sort({ timestamp: -1 })
			.limit(1)
			.lean();

		expect(events.length).toBe(1);

		const event = events[0];
		expect(event).toBeDefined();
		if (!event) return; // Type guard

		expect(event.type).toBe(SecurityEventType.KEY_ROTATION);
		expect(event.severity).toBe(SecurityEventSeverity.LOW);
		expect(event.tenantId).toBeNull();
		expect(event.userId).toBeNull();

		// Cleanup
		await SecurityEvent.deleteMany({ _id: event._id });
	});

	it("handles errors gracefully without throwing", async () => {
		// This should not throw even if there's an issue
		expect(() => {
			emitSecurityEvent({
				type: SecurityEventType.ADMIN_ACTION,
				severity: SecurityEventSeverity.HIGH,
				userId: "test-user",
			});
		}).not.toThrow();
	});

	it("emits multiple events in sequence", async () => {
		const events = [
			{
				type: SecurityEventType.MFA_FAILED,
				severity: SecurityEventSeverity.HIGH,
				userId: "user-1",
			},
			{
				type: SecurityEventType.PERMISSION_DENIED,
				severity: SecurityEventSeverity.MEDIUM,
				userId: "user-2",
			},
			{
				type: SecurityEventType.SUSPICIOUS_ACTIVITY,
				severity: SecurityEventSeverity.CRITICAL,
				userId: "user-3",
			},
		];

		// Emit all events
		for (const event of events) {
			emitSecurityEvent(event);
		}

		// Wait for all async operations
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Verify all events were created
		for (const eventData of events) {
			const found = await SecurityEvent.find({
				type: eventData.type,
				userId: eventData.userId,
			}).lean();

			expect(found.length).toBeGreaterThan(0);

			// Cleanup
			await SecurityEvent.deleteMany({ type: eventData.type });
		}
	});
});

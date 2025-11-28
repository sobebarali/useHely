import dotenv from "dotenv";
import { afterAll, afterEach, beforeAll } from "vitest";

// Load test environment variables
dotenv.config({ path: ".env.test" });

beforeAll(async () => {
	// Global setup - runs once before all tests
	console.log("🚀 Starting test suite...");
});

afterAll(async () => {
	// Global teardown - runs once after all tests
	console.log("✅ Test suite completed");
});

afterEach(async () => {
	// Cleanup after each test
	// Example: Clear database collections, reset mocks, etc.
});

// Test utilities can be added here
export const testUtils = {
	// Add any shared test utilities here
	// Example: createTestUser, cleanupDatabase, etc.
};

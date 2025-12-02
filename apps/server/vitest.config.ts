import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		setupFiles: ["./__tests__/setup.ts"],
		include: ["__tests__/**/*.{test,spec}.{js,ts}"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"__tests__/",
				"dist/",
				"*.config.ts",
				"**/*.d.ts",
			],
		},
		testTimeout: 10000,
		// Run tests sequentially to avoid conflicts with shared database state
		// especially for tests that modify encryption keys or global data
		fileParallelism: false,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});

// @ts-check

import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: "HMS Docs",
			sidebar: [
				{
					label: "Guides",
					items: [
						{ label: "Getting Started", slug: "guides/getting-started" },
						{ label: "Architecture", slug: "guides/architecture" },
						{ label: "Authentication", slug: "guides/authentication" },
					],
				},
				{
					label: "API Reference",
					autogenerate: { directory: "api" },
				},
			],
		}),
	],
});

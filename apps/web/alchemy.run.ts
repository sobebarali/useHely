import alchemy from "alchemy";
import { Vite } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });

const app = await alchemy("hms");

export const web = await Vite("web", {
	assets: "dist",
	bindings: {
		VITE_SERVER_URL: process.env.VITE_SERVER_URL || "",
	},
	dev: {
		command: "npm run dev",
	},
});

console.log(`Web    -> ${web.url}`);

await app.finalize();

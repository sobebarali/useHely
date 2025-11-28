import "dotenv/config";
import { auth } from "@hms/auth";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";

export const app = express();

app.use(
	cors({
		origin: process.env.CORS_ORIGIN || "",
		methods: ["GET", "POST", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.all("/api/auth{/*path}", toNodeHandler(auth));

app.use(express.json());

app.get("/", (_req, res) => {
	res.status(200).send("OK");
});

// Only start server if not in test environment
if (process.env.NODE_ENV !== "test") {
	const port = process.env.PORT || 3000;
	app.listen(port, () => {
		console.log(`Server is running on port ${port}`);
	});
}

import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/admin/")({
	component: AdminIndexPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
		// Redirect to security overview by default
		throw redirect({ to: "/dashboard/admin/security" });
	},
});

function AdminIndexPage() {
	return null;
}

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/admin")({
	component: AdminLayout,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
		// TODO: Add permission check for admin access
	},
});

function AdminLayout() {
	return <Outlet />;
}

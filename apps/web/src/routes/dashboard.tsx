import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import Loader from "@/components/loader";
import { useSession } from "@/hooks/use-auth";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard")({
	component: DashboardLayoutRoute,
	beforeLoad: async () => {
		// Check if user is authenticated
		if (!authClient.isAuthenticated()) {
			throw redirect({
				to: "/login",
			});
		}
	},
});

function DashboardLayoutRoute() {
	const { data: session, isLoading } = useSession();

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader />
			</div>
		);
	}

	if (!session) {
		// This shouldn't happen due to beforeLoad, but handle gracefully
		return null;
	}

	const user = {
		name: `${session.firstName} ${session.lastName}`.trim() || session.username,
		email: session.email,
		image: undefined,
	};

	return (
		<DashboardLayout user={user} pageTitle="Dashboard">
			<Outlet />
		</DashboardLayout>
	);
}

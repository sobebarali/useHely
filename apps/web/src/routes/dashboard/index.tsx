import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import {
	DoctorDashboard,
	NurseDashboard,
	PharmacistDashboard,
	ReceptionistDashboard,
} from "@/components/dashboard-role-specific";
import { SectionCards } from "@/components/section-cards";
import { Button } from "@/components/ui/button";
import { useDashboardType, useRefreshDashboard } from "@/hooks/use-dashboard";

export const Route = createFileRoute("/dashboard/")({
	component: DashboardHomePage,
});

function DashboardHomePage() {
	const refreshMutation = useRefreshDashboard();
	const dashboardType = useDashboardType();

	const handleRefresh = async () => {
		try {
			await refreshMutation.mutateAsync();
			toast.success("Dashboard refreshed successfully");
		} catch {
			toast.error("Failed to refresh dashboard");
		}
	};

	// Render role-specific dashboard
	const renderRoleSpecificDashboard = () => {
		switch (dashboardType) {
			case "doctor":
				return <DoctorDashboard />;
			case "nurse":
				return <NurseDashboard />;
			case "pharmacist":
				return <PharmacistDashboard />;
			case "receptionist":
				return <ReceptionistDashboard />;
			default:
				// Hospital admin or fallback - show default dashboard
				return null;
		}
	};

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="flex items-center justify-between px-4 lg:px-6">
				<div>
					<h1 className="font-bold text-3xl tracking-tight">Dashboard</h1>
					<p className="text-muted-foreground">
						Welcome back! Here's an overview of your hospital.
					</p>
				</div>
				<Button
					onClick={handleRefresh}
					disabled={refreshMutation.isPending}
					variant="outline"
					size="sm"
				>
					<RefreshCw
						className={`mr-2 h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`}
					/>
					Refresh
				</Button>
			</div>

			{/* Show default dashboard for hospital admin or when role is not specific */}
			{(!dashboardType || dashboardType === "hospital_admin") && (
				<>
					<SectionCards />
					<div className="px-4 lg:px-6">
						<ChartAreaInteractive />
					</div>
				</>
			)}

			{/* Show role-specific dashboard for other roles */}
			{renderRoleSpecificDashboard()}
		</div>
	);
}

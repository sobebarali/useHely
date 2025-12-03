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
import {
	BedOccupancyWidget,
	DepartmentLoadWidget,
	StaffAttendanceWidget,
} from "@/components/dashboard-widgets";
import { SectionCards } from "@/components/section-cards";
import { Button } from "@/components/ui/button";
import { useDashboardType, useRefreshDashboard } from "@/hooks/use-dashboard";
import { useTerminology } from "@/hooks/use-terminology";

export const Route = createFileRoute("/dashboard/")({
	component: DashboardHomePage,
});

function DashboardHomePage() {
	const refreshMutation = useRefreshDashboard();
	const dashboardType = useDashboardType();
	const { terminology } = useTerminology();

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
				// Organization admin or fallback - show default dashboard
				return null;
		}
	};

	return (
		<div className="flex flex-col gap-6 py-6">
			{/* Header */}
			<div className="flex items-center justify-between px-4 lg:px-6">
				<div>
					<h1 className="font-bold text-2xl tracking-tight md:text-3xl">
						{terminology.dashboardTitle}
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Welcome back! Here's an overview of your{" "}
						{terminology.organization.toLowerCase()}.
					</p>
				</div>
				<Button
					onClick={handleRefresh}
					disabled={refreshMutation.isPending}
					variant="outline"
					size="sm"
					className="gap-2"
				>
					<RefreshCw
						className={`h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`}
					/>
					<span className="hidden sm:inline">Refresh</span>
				</Button>
			</div>

			{/* Show default dashboard for hospital admin or when role is not specific */}
			{(!dashboardType || dashboardType === "hospital_admin") && (
				<>
					{/* Stats Cards */}
					<SectionCards />

					{/* Trends Chart */}
					<div className="px-4 lg:px-6">
						<ChartAreaInteractive />
					</div>

					{/* Widgets Row */}
					<div className="grid gap-6 px-4 md:grid-cols-2 lg:px-6">
						<DepartmentLoadWidget />
						<BedOccupancyWidget />
					</div>

					{/* Staff Attendance - Full Width */}
					<div className="px-4 lg:px-6">
						<StaffAttendanceWidget />
					</div>
				</>
			)}

			{/* Show role-specific dashboard for other roles */}
			{renderRoleSpecificDashboard()}
		</div>
	);
}

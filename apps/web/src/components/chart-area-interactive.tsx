import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardTrends } from "@/hooks/use-dashboard";

export const description = "Patient and appointment trends";

export function ChartAreaInteractive() {
	const { trends, isLoading, error } = useDashboardTrends();

	if (error) {
		return (
			<Card className="@container/card">
				<CardHeader>
					<CardTitle>Patient & Appointment Trends</CardTitle>
					<CardDescription>
						<span className="@[540px]/card:block hidden">
							New patient registrations and appointments over time
						</span>
						<span className="@[540px]/card:hidden">Activity trends</span>
					</CardDescription>
				</CardHeader>
				<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
					<div className="flex h-[250px] w-full items-center justify-center rounded-lg border border-dashed">
						<p className="text-muted-foreground text-sm">
							Failed to load trend data
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (isLoading) {
		return (
			<Card className="@container/card">
				<CardHeader>
					<CardTitle>Patient & Appointment Trends</CardTitle>
					<CardDescription>
						<span className="@[540px]/card:block hidden">
							New patient registrations and appointments over time
						</span>
						<span className="@[540px]/card:hidden">Activity trends</span>
					</CardDescription>
				</CardHeader>
				<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
					<Skeleton className="h-[250px] w-full" />
				</CardContent>
			</Card>
		);
	}

	// Combine patient and appointment trends for the chart
	const chartData = trends.patientTrend.map(
		(patientItem: { date: string; count: number }, index: number) => {
			const appointmentItem = trends.appointmentTrend[index];
			return {
				date: patientItem.date,
				patients: patientItem.count,
				appointments: appointmentItem?.count || 0,
			};
		},
	);

	// If no data available
	if (chartData.length === 0) {
		return (
			<Card className="@container/card">
				<CardHeader>
					<CardTitle>Patient & Appointment Trends</CardTitle>
					<CardDescription>
						<span className="@[540px]/card:block hidden">
							New patient registrations and appointments over time
						</span>
						<span className="@[540px]/card:hidden">Activity trends</span>
					</CardDescription>
				</CardHeader>
				<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
					<div className="flex h-[250px] w-full items-center justify-center rounded-lg border border-dashed">
						<p className="text-muted-foreground text-sm">
							No trend data available
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="@container/card">
			<CardHeader>
				<CardTitle>Patient & Appointment Trends</CardTitle>
				<CardDescription>
					<span className="@[540px]/card:block hidden">
						New patient registrations and appointments over time
					</span>
					<span className="@[540px]/card:hidden">Activity trends</span>
				</CardDescription>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				<ResponsiveContainer width="100%" height={250}>
					<AreaChart data={chartData}>
						<defs>
							<linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="hsl(var(--chart-1))"
									stopOpacity={0.8}
								/>
								<stop
									offset="95%"
									stopColor="hsl(var(--chart-1))"
									stopOpacity={0}
								/>
							</linearGradient>
							<linearGradient
								id="colorAppointments"
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop
									offset="5%"
									stopColor="hsl(var(--chart-2))"
									stopOpacity={0.8}
								/>
								<stop
									offset="95%"
									stopColor="hsl(var(--chart-2))"
									stopOpacity={0}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis
							dataKey="date"
							tick={{ fontSize: 12 }}
							tickFormatter={(value) => {
								const date = new Date(value);
								return date.toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
								});
							}}
						/>
						<YAxis tick={{ fontSize: 12 }} />
						<Tooltip
							labelFormatter={(value) => {
								const date = new Date(value);
								return date.toLocaleDateString("en-US", {
									weekday: "short",
									month: "short",
									day: "numeric",
								});
							}}
							formatter={(value: number, name: string) => [
								value,
								name === "patients" ? "New Patients" : "Appointments",
							]}
						/>
						<Area
							type="monotone"
							dataKey="patients"
							stroke="hsl(var(--chart-1))"
							fillOpacity={1}
							fill="url(#colorPatients)"
							stackId="1"
						/>
						<Area
							type="monotone"
							dataKey="appointments"
							stroke="hsl(var(--chart-2))"
							fillOpacity={1}
							fill="url(#colorAppointments)"
							stackId="2"
						/>
					</AreaChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}

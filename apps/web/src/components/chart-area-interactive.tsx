import { TrendingUp } from "lucide-react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Legend,
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

interface CustomTooltipProps {
	active?: boolean;
	payload?: Array<{
		name: string;
		value: number;
		color: string;
	}>;
	label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
	if (!active || !payload || !payload.length) return null;

	const date = new Date(label || "");
	const formattedDate = date.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	});

	return (
		<div className="rounded-lg border bg-card p-3 shadow-lg">
			<p className="mb-2 font-medium text-card-foreground text-sm">
				{formattedDate}
			</p>
			<div className="space-y-1">
				{payload.map((entry) => (
					<div key={entry.name} className="flex items-center gap-2">
						<div
							className="h-2.5 w-2.5 rounded-full"
							style={{ backgroundColor: entry.color }}
						/>
						<span className="text-muted-foreground text-xs">
							{entry.name === "patients" ? "New Patients" : "Appointments"}:
						</span>
						<span className="font-medium text-card-foreground text-xs">
							{entry.value}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

interface CustomLegendProps {
	payload?: Array<{
		value: string;
		color: string;
	}>;
}

function CustomLegend({ payload }: CustomLegendProps) {
	if (!payload) return null;

	return (
		<div className="flex items-center justify-center gap-6 pt-4">
			{payload.map((entry) => (
				<div key={entry.value} className="flex items-center gap-2">
					<div
						className="h-3 w-3 rounded-full"
						style={{ backgroundColor: entry.color }}
					/>
					<span className="text-muted-foreground text-sm">
						{entry.value === "patients" ? "New Patients" : "Appointments"}
					</span>
				</div>
			))}
		</div>
	);
}

export function ChartAreaInteractive() {
	const { trends, isLoading, error } = useDashboardTrends();

	if (error) {
		return (
			<Card className="@container/card">
				<CardHeader>
					<div className="flex items-center gap-2">
						<TrendingUp className="h-5 w-5 text-muted-foreground" />
						<CardTitle>Patient & Appointment Trends</CardTitle>
					</div>
					<CardDescription>
						<span className="@[540px]/card:block hidden">
							New patient registrations and appointments over time
						</span>
						<span className="@[540px]/card:hidden">Activity trends</span>
					</CardDescription>
				</CardHeader>
				<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
					<div className="flex h-[280px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20">
						<TrendingUp className="h-8 w-8 text-muted-foreground/50" />
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
					<div className="flex items-center gap-2">
						<Skeleton className="h-5 w-5 rounded" />
						<Skeleton className="h-6 w-48" />
					</div>
					<Skeleton className="mt-1 h-4 w-64" />
				</CardHeader>
				<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
					<Skeleton className="h-[280px] w-full rounded-lg" />
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
					<div className="flex items-center gap-2">
						<TrendingUp className="h-5 w-5 text-muted-foreground" />
						<CardTitle>Patient & Appointment Trends</CardTitle>
					</div>
					<CardDescription>
						<span className="@[540px]/card:block hidden">
							New patient registrations and appointments over time
						</span>
						<span className="@[540px]/card:hidden">Activity trends</span>
					</CardDescription>
				</CardHeader>
				<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
					<div className="flex h-[280px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20">
						<TrendingUp className="h-8 w-8 text-muted-foreground/50" />
						<p className="text-muted-foreground text-sm">
							No trend data available yet
						</p>
						<p className="text-muted-foreground/70 text-xs">
							Data will appear as patients and appointments are recorded
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="@container/card">
			<CardHeader>
				<div className="flex items-center gap-2">
					<TrendingUp className="h-5 w-5 text-primary" />
					<CardTitle>Patient & Appointment Trends</CardTitle>
				</div>
				<CardDescription>
					<span className="@[540px]/card:block hidden">
						New patient registrations and appointments over time
					</span>
					<span className="@[540px]/card:hidden">Activity trends</span>
				</CardDescription>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				<ResponsiveContainer width="100%" height={280}>
					<AreaChart
						data={chartData}
						margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
					>
						<defs>
							<linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="hsl(var(--chart-1))"
									stopOpacity={0.4}
								/>
								<stop
									offset="95%"
									stopColor="hsl(var(--chart-1))"
									stopOpacity={0.05}
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
									stopOpacity={0.4}
								/>
								<stop
									offset="95%"
									stopColor="hsl(var(--chart-2))"
									stopOpacity={0.05}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid
							strokeDasharray="3 3"
							stroke="hsl(var(--border))"
							strokeOpacity={0.5}
							vertical={false}
						/>
						<XAxis
							dataKey="date"
							tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
							tickLine={false}
							axisLine={{ stroke: "hsl(var(--border))" }}
							tickFormatter={(value) => {
								const date = new Date(value);
								return date.toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
								});
							}}
							dy={10}
						/>
						<YAxis
							tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
							tickLine={false}
							axisLine={false}
							tickFormatter={(value) => value.toLocaleString()}
							width={40}
						/>
						<Tooltip content={<CustomTooltip />} />
						<Legend content={<CustomLegend />} />
						<Area
							type="monotone"
							dataKey="patients"
							stroke="hsl(var(--chart-1))"
							strokeWidth={2}
							fillOpacity={1}
							fill="url(#colorPatients)"
							dot={false}
							activeDot={{
								r: 5,
								fill: "hsl(var(--chart-1))",
								stroke: "hsl(var(--background))",
								strokeWidth: 2,
							}}
						/>
						<Area
							type="monotone"
							dataKey="appointments"
							stroke="hsl(var(--chart-2))"
							strokeWidth={2}
							fillOpacity={1}
							fill="url(#colorAppointments)"
							dot={false}
							activeDot={{
								r: 5,
								fill: "hsl(var(--chart-2))",
								stroke: "hsl(var(--background))",
								strokeWidth: 2,
							}}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}

/**
 * Dashboard Widgets
 *
 * Additional widget components for the dashboard
 */

import { BedDouble, Building2, CheckCircle2, Users, UserX } from "lucide-react";
import {
	Bar,
	BarChart,
	Cell,
	Pie,
	PieChart,
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
import { useWidget } from "@/hooks/use-dashboard";

const COLORS = [
	"hsl(var(--chart-1))",
	"hsl(var(--chart-2))",
	"hsl(var(--chart-3))",
	"hsl(var(--chart-4))",
	"hsl(var(--chart-5))",
];

interface CustomBarTooltipProps {
	active?: boolean;
	payload?: Array<{
		value: number;
		payload: { name: string };
	}>;
}

function CustomBarTooltip({ active, payload }: CustomBarTooltipProps) {
	if (!active || !payload || !payload.length) return null;

	return (
		<div className="rounded-lg border bg-card p-2.5 shadow-lg">
			<p className="font-medium text-card-foreground text-sm">
				{payload[0]?.payload.name}
			</p>
			<p className="text-muted-foreground text-xs">
				{payload[0]?.value} appointments
			</p>
		</div>
	);
}

/**
 * Department Load Widget
 * Shows appointments per department as a bar chart
 */
export function DepartmentLoadWidget() {
	const { data: widgetData, isLoading, error } = useWidget("department-load");

	if (error) {
		return (
			<Card className="h-full">
				<CardHeader className="pb-2">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
							<Building2 className="h-4 w-4 text-primary" />
						</div>
						<div>
							<CardTitle className="text-base">Department Load</CardTitle>
							<CardDescription className="text-xs">
								Appointments by department today
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20">
						<Building2 className="h-8 w-8 text-muted-foreground/50" />
						<p className="text-muted-foreground text-sm">
							Failed to load department data
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (isLoading) {
		return (
			<Card className="h-full">
				<CardHeader className="pb-2">
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-8 rounded-lg" />
						<div>
							<Skeleton className="h-5 w-32" />
							<Skeleton className="mt-1 h-3 w-44" />
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[200px] w-full rounded-lg" />
				</CardContent>
			</Card>
		);
	}

	const data =
		(widgetData?.data as {
			departmentId: string;
			name: string;
			load: number;
		}[]) || [];

	if (data.length === 0) {
		return (
			<Card className="h-full">
				<CardHeader className="pb-2">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
							<Building2 className="h-4 w-4 text-primary" />
						</div>
						<div>
							<CardTitle className="text-base">Department Load</CardTitle>
							<CardDescription className="text-xs">
								Appointments by department today
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20">
						<Building2 className="h-8 w-8 text-muted-foreground/50" />
						<p className="text-muted-foreground text-sm">
							No department data available
						</p>
						<p className="text-muted-foreground/70 text-xs">
							Department loads will appear when appointments are scheduled
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="h-full">
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
						<Building2 className="h-4 w-4 text-primary" />
					</div>
					<div>
						<CardTitle className="text-base">Department Load</CardTitle>
						<CardDescription className="text-xs">
							Appointments by department today
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={200}>
					<BarChart
						data={data}
						layout="vertical"
						margin={{ left: 0, right: 10 }}
					>
						<XAxis
							type="number"
							tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
							tickLine={false}
							axisLine={{ stroke: "hsl(var(--border))" }}
						/>
						<YAxis
							dataKey="name"
							type="category"
							width={90}
							tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
							tickLine={false}
							axisLine={false}
						/>
						<Tooltip
							content={<CustomBarTooltip />}
							cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
						/>
						<Bar dataKey="load" radius={[0, 4, 4, 0]} maxBarSize={28}>
							{data.map((_, index) => (
								<Cell
									key={`cell-${data[index]?.departmentId || index}`}
									fill={COLORS[index % COLORS.length]}
								/>
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}

interface CustomPieTooltipProps {
	active?: boolean;
	payload?: Array<{
		name: string;
		value: number;
		payload: { color: string };
	}>;
}

function CustomPieTooltip({ active, payload }: CustomPieTooltipProps) {
	if (!active || !payload || !payload.length) return null;

	return (
		<div className="rounded-lg border bg-card p-2.5 shadow-lg">
			<div className="flex items-center gap-2">
				<div
					className="h-2.5 w-2.5 rounded-full"
					style={{ backgroundColor: payload[0]?.payload.color }}
				/>
				<span className="text-card-foreground text-sm">{payload[0]?.name}</span>
			</div>
			<p className="mt-1 font-medium text-card-foreground text-sm">
				{payload[0]?.value} beds
			</p>
		</div>
	);
}

/**
 * Bed Occupancy Widget
 * Shows bed occupancy as a donut chart
 */
export function BedOccupancyWidget() {
	const { data: widgetData, isLoading, error } = useWidget("bed-occupancy");

	if (error) {
		return (
			<Card className="h-full">
				<CardHeader className="pb-2">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
							<BedDouble className="h-4 w-4 text-chart-2" />
						</div>
						<div>
							<CardTitle className="text-base">Bed Occupancy</CardTitle>
							<CardDescription className="text-xs">
								Current bed utilization
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20">
						<BedDouble className="h-8 w-8 text-muted-foreground/50" />
						<p className="text-muted-foreground text-sm">
							Failed to load occupancy data
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (isLoading) {
		return (
			<Card className="h-full">
				<CardHeader className="pb-2">
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-8 rounded-lg" />
						<div>
							<Skeleton className="h-5 w-28" />
							<Skeleton className="mt-1 h-3 w-36" />
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[200px] w-full rounded-lg" />
				</CardContent>
			</Card>
		);
	}

	const data = widgetData?.data as {
		occupied: number;
		total: number;
		available: number;
		occupancyRate: number;
	} | null;

	if (!data) {
		return (
			<Card className="h-full">
				<CardHeader className="pb-2">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
							<BedDouble className="h-4 w-4 text-chart-2" />
						</div>
						<div>
							<CardTitle className="text-base">Bed Occupancy</CardTitle>
							<CardDescription className="text-xs">
								Current bed utilization
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20">
						<BedDouble className="h-8 w-8 text-muted-foreground/50" />
						<p className="text-muted-foreground text-sm">
							No occupancy data available
						</p>
						<p className="text-muted-foreground/70 text-xs">
							Configure bed capacity to see occupancy stats
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	const chartData = [
		{ name: "Occupied", value: data.occupied, color: "hsl(var(--chart-1))" },
		{ name: "Available", value: data.available, color: "hsl(var(--chart-2))" },
	];

	// Determine occupancy status for color coding
	const getOccupancyStatus = (rate: number) => {
		if (rate >= 90)
			return { color: "text-red-500 dark:text-red-400", label: "Critical" };
		if (rate >= 75)
			return { color: "text-amber-500 dark:text-amber-400", label: "High" };
		return { color: "text-emerald-500 dark:text-emerald-400", label: "Normal" };
	};

	const occupancyStatus = getOccupancyStatus(data.occupancyRate);

	return (
		<Card className="h-full">
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
						<BedDouble className="h-4 w-4 text-chart-2" />
					</div>
					<div>
						<CardTitle className="text-base">Bed Occupancy</CardTitle>
						<CardDescription className="text-xs">
							Current bed utilization
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-6">
					<div className="relative">
						<ResponsiveContainer width={140} height={140}>
							<PieChart>
								<Pie
									data={chartData}
									cx="50%"
									cy="50%"
									innerRadius={45}
									outerRadius={65}
									paddingAngle={3}
									dataKey="value"
									strokeWidth={0}
								>
									{chartData.map((entry) => (
										<Cell key={`cell-${entry.name}`} fill={entry.color} />
									))}
								</Pie>
								<Tooltip content={<CustomPieTooltip />} />
							</PieChart>
						</ResponsiveContainer>
						{/* Center percentage */}
						<div className="absolute inset-0 flex flex-col items-center justify-center">
							<span className={`font-bold text-2xl ${occupancyStatus.color}`}>
								{data.occupancyRate}%
							</span>
						</div>
					</div>
					<div className="flex flex-1 flex-col gap-3">
						<div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
							<div className="flex items-center gap-2">
								<div
									className="h-3 w-3 rounded-full"
									style={{ backgroundColor: "hsl(var(--chart-1))" }}
								/>
								<span className="text-muted-foreground text-sm">Occupied</span>
							</div>
							<span className="font-semibold">{data.occupied}</span>
						</div>
						<div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
							<div className="flex items-center gap-2">
								<div
									className="h-3 w-3 rounded-full"
									style={{ backgroundColor: "hsl(var(--chart-2))" }}
								/>
								<span className="text-muted-foreground text-sm">Available</span>
							</div>
							<span className="font-semibold">{data.available}</span>
						</div>
						<div className="border-t pt-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Total Capacity</span>
								<span className="font-medium">{data.total} beds</span>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * Staff Attendance Widget
 * Shows staff attendance status with visual indicators
 */
export function StaffAttendanceWidget() {
	const { data: widgetData, isLoading, error } = useWidget("staff-attendance");

	if (error) {
		return (
			<Card>
				<CardHeader className="pb-2">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-3/10">
							<Users className="h-4 w-4 text-chart-3" />
						</div>
						<div>
							<CardTitle className="text-base">Staff Attendance</CardTitle>
							<CardDescription className="text-xs">
								Today's staff activity
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex h-[80px] items-center justify-center rounded-lg border border-dashed bg-muted/20">
						<p className="text-muted-foreground text-sm">
							Failed to load attendance data
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (isLoading) {
		return (
			<Card>
				<CardHeader className="pb-2">
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-8 rounded-lg" />
						<div>
							<Skeleton className="h-5 w-32" />
							<Skeleton className="mt-1 h-3 w-36" />
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[80px] w-full rounded-lg" />
				</CardContent>
			</Card>
		);
	}

	const data = widgetData?.data as {
		total: number;
		present: number;
		absent: number;
		attendanceRate: number;
	} | null;

	if (!data) {
		return (
			<Card>
				<CardHeader className="pb-2">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-3/10">
							<Users className="h-4 w-4 text-chart-3" />
						</div>
						<div>
							<CardTitle className="text-base">Staff Attendance</CardTitle>
							<CardDescription className="text-xs">
								Today's staff activity
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex h-[80px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20">
						<p className="text-muted-foreground text-sm">
							No attendance data available
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Calculate progress bar width
	const attendancePercentage = Math.min(data.attendanceRate, 100);

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-3/10">
						<Users className="h-4 w-4 text-chart-3" />
					</div>
					<div>
						<CardTitle className="text-base">Staff Attendance</CardTitle>
						<CardDescription className="text-xs">
							Today's staff activity
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{/* Progress bar */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="font-semibold text-2xl">
								{data.attendanceRate}%
							</span>
							<span className="text-muted-foreground text-sm">
								Attendance Rate
							</span>
						</div>
						<div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-gradient-to-r from-chart-3 to-chart-1 transition-all duration-500"
								style={{ width: `${attendancePercentage}%` }}
							/>
						</div>
					</div>

					{/* Stats row */}
					<div className="grid grid-cols-3 gap-3">
						<div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 dark:bg-emerald-500/20">
							<CheckCircle2 className="h-4 w-4 text-emerald-500" />
							<div>
								<p className="font-semibold text-lg leading-none">
									{data.present}
								</p>
								<p className="text-muted-foreground text-xs">Active</p>
							</div>
						</div>
						<div className="flex items-center gap-2 rounded-lg bg-gray-500/10 px-3 py-2 dark:bg-gray-500/20">
							<UserX className="h-4 w-4 text-gray-500" />
							<div>
								<p className="font-semibold text-lg leading-none">
									{data.absent}
								</p>
								<p className="text-muted-foreground text-xs">Inactive</p>
							</div>
						</div>
						<div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 dark:bg-primary/20">
							<Users className="h-4 w-4 text-primary" />
							<div>
								<p className="font-semibold text-lg leading-none">
									{data.total}
								</p>
								<p className="text-muted-foreground text-xs">Total</p>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

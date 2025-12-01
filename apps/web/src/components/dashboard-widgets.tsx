/**
 * Dashboard Widgets
 *
 * Additional widget components for the dashboard
 */

import { BedDouble, Building2, Users } from "lucide-react";
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

/**
 * Department Load Widget
 * Shows appointments per department as a bar chart
 */
export function DepartmentLoadWidget() {
	const { data: widgetData, isLoading, error } = useWidget("department-load");

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Building2 className="h-5 w-5" />
						Department Load
					</CardTitle>
					<CardDescription>Appointments by department today</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
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
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Building2 className="h-5 w-5" />
						Department Load
					</CardTitle>
					<CardDescription>Appointments by department today</CardDescription>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[200px] w-full" />
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
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Building2 className="h-5 w-5" />
						Department Load
					</CardTitle>
					<CardDescription>Appointments by department today</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
						<p className="text-muted-foreground text-sm">
							No department data available
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Building2 className="h-5 w-5" />
					Department Load
				</CardTitle>
				<CardDescription>Appointments by department today</CardDescription>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={200}>
					<BarChart data={data} layout="vertical">
						<XAxis type="number" />
						<YAxis
							dataKey="name"
							type="category"
							width={100}
							tick={{ fontSize: 12 }}
						/>
						<Tooltip
							formatter={(value: number) => [value, "Appointments"]}
							contentStyle={{
								backgroundColor: "hsl(var(--card))",
								borderColor: "hsl(var(--border))",
							}}
						/>
						<Bar dataKey="load" radius={[0, 4, 4, 0]}>
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

/**
 * Bed Occupancy Widget
 * Shows bed occupancy as a donut chart
 */
export function BedOccupancyWidget() {
	const { data: widgetData, isLoading, error } = useWidget("bed-occupancy");

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<BedDouble className="h-5 w-5" />
						Bed Occupancy
					</CardTitle>
					<CardDescription>Current bed utilization</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
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
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<BedDouble className="h-5 w-5" />
						Bed Occupancy
					</CardTitle>
					<CardDescription>Current bed utilization</CardDescription>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[200px] w-full" />
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
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<BedDouble className="h-5 w-5" />
						Bed Occupancy
					</CardTitle>
					<CardDescription>Current bed utilization</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
						<p className="text-muted-foreground text-sm">
							No occupancy data available
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

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<BedDouble className="h-5 w-5" />
					Bed Occupancy
				</CardTitle>
				<CardDescription>Current bed utilization</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-4">
					<ResponsiveContainer width="50%" height={200}>
						<PieChart>
							<Pie
								data={chartData}
								cx="50%"
								cy="50%"
								innerRadius={50}
								outerRadius={70}
								paddingAngle={5}
								dataKey="value"
							>
								{chartData.map((entry) => (
									<Cell key={`cell-${entry.name}`} fill={entry.color} />
								))}
							</Pie>
							<Tooltip
								formatter={(value: number, name: string) => [value, name]}
								contentStyle={{
									backgroundColor: "hsl(var(--card))",
									borderColor: "hsl(var(--border))",
								}}
							/>
						</PieChart>
					</ResponsiveContainer>
					<div className="flex flex-col gap-3">
						<div>
							<p className="font-bold text-3xl">{data.occupancyRate}%</p>
							<p className="text-muted-foreground text-sm">Occupancy Rate</p>
						</div>
						<div className="space-y-1 text-sm">
							<div className="flex items-center gap-2">
								<div
									className="h-3 w-3 rounded-full"
									style={{ backgroundColor: "hsl(var(--chart-1))" }}
								/>
								<span>Occupied: {data.occupied}</span>
							</div>
							<div className="flex items-center gap-2">
								<div
									className="h-3 w-3 rounded-full"
									style={{ backgroundColor: "hsl(var(--chart-2))" }}
								/>
								<span>Available: {data.available}</span>
							</div>
							<div className="flex items-center gap-2 text-muted-foreground">
								<span>Total: {data.total} beds</span>
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
 * Shows staff attendance status
 */
export function StaffAttendanceWidget() {
	const { data: widgetData, isLoading, error } = useWidget("staff-attendance");

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						Staff Attendance
					</CardTitle>
					<CardDescription>Today's staff activity</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex h-[100px] items-center justify-center rounded-lg border border-dashed">
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
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						Staff Attendance
					</CardTitle>
					<CardDescription>Today's staff activity</CardDescription>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[100px] w-full" />
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
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						Staff Attendance
					</CardTitle>
					<CardDescription>Today's staff activity</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex h-[100px] items-center justify-center rounded-lg border border-dashed">
						<p className="text-muted-foreground text-sm">
							No attendance data available
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Users className="h-5 w-5" />
					Staff Attendance
				</CardTitle>
				<CardDescription>Today's staff activity</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex items-center justify-between">
					<div>
						<p className="font-bold text-3xl">{data.attendanceRate}%</p>
						<p className="text-muted-foreground text-sm">Attendance Rate</p>
					</div>
					<div className="grid grid-cols-3 gap-4 text-center">
						<div>
							<p className="font-semibold text-green-600 text-xl dark:text-green-400">
								{data.present}
							</p>
							<p className="text-muted-foreground text-xs">Active</p>
						</div>
						<div>
							<p className="font-semibold text-gray-600 text-xl dark:text-gray-400">
								{data.absent}
							</p>
							<p className="text-muted-foreground text-xs">Inactive</p>
						</div>
						<div>
							<p className="font-semibold text-xl">{data.total}</p>
							<p className="text-muted-foreground text-xs">Total</p>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

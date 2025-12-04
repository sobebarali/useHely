import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	ArrowLeft,
	Calendar,
	Download,
	FileBarChart,
	Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useDepartments } from "@/hooks/use-departments";
import {
	type ReportFormat,
	type ReportType,
	useGenerateReport,
} from "@/hooks/use-reports";
import { useUsers } from "@/hooks/use-users";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/reports-client";
import { normalizeSelectValue, SELECT_ALL_VALUE } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/reports/appointments")({
	component: AppointmentReportsPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function AppointmentReportsPage() {
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");
	const [format, setFormat] = useState<ReportFormat>("pdf");
	const [doctorId, setDoctorId] = useState<string>("");
	const [departmentId, setDepartmentId] = useState<string>("");
	const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

	const generateMutation = useGenerateReport();

	// Fetch filters data
	const { data: doctorsData } = useUsers({
		role: "DOCTOR",
		status: "ACTIVE",
		limit: 100,
	});
	const { data: departmentsData } = useDepartments({ status: "ACTIVE" });

	const handleGenerate = async (reportType: ReportType) => {
		try {
			const result = await generateMutation.mutateAsync({
				reportType,
				format,
				parameters: {
					startDate: startDate || undefined,
					endDate: endDate || undefined,
					doctorId: normalizeSelectValue(doctorId) || undefined,
					departmentId: normalizeSelectValue(departmentId) || undefined,
					groupBy,
				},
			});
			toast.success(`Report generation started. Report ID: ${result.reportId}`);
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to generate report");
		}
	};

	const reportTypes: { id: ReportType; name: string; description: string }[] = [
		{
			id: "appointment-summary",
			name: "Appointment Summary",
			description:
				"Summary of appointments including status breakdown, no-shows, and cancellations",
		},
		{
			id: "doctor-performance",
			name: "Doctor Performance",
			description:
				"Performance metrics for doctors including patient count, average consultation time",
		},
	];

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link to="/dashboard/reports">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div>
					<h1 className="flex items-center gap-2 font-bold text-2xl">
						<Calendar className="h-6 w-6" />
						Appointment Reports
					</h1>
					<p className="text-muted-foreground">
						Generate appointment-related reports and analytics
					</p>
				</div>
			</div>

			{/* Filter Controls */}
			<Card>
				<CardHeader>
					<CardTitle>Report Parameters</CardTitle>
					<CardDescription>
						Set the filters and format for your reports
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="start-date">Start Date</Label>
							<Input
								id="start-date"
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="end-date">End Date</Label>
							<Input
								id="end-date"
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="doctor">Doctor</Label>
							<Select value={doctorId} onValueChange={setDoctorId}>
								<SelectTrigger id="doctor">
									<SelectValue placeholder="All Doctors" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={SELECT_ALL_VALUE}>All Doctors</SelectItem>
									{doctorsData?.data.map((doctor) => (
										<SelectItem key={doctor.id} value={doctor.id}>
											Dr. {doctor.firstName} {doctor.lastName}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="department">Department</Label>
							<Select value={departmentId} onValueChange={setDepartmentId}>
								<SelectTrigger id="department">
									<SelectValue placeholder="All Departments" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={SELECT_ALL_VALUE}>
										All Departments
									</SelectItem>
									{departmentsData?.data.map((dept) => (
										<SelectItem key={dept.id} value={dept.id}>
											{dept.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="group-by">Group By</Label>
							<Select
								value={groupBy}
								onValueChange={(v) => setGroupBy(v as "day" | "week" | "month")}
							>
								<SelectTrigger id="group-by">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="day">Day</SelectItem>
									<SelectItem value="week">Week</SelectItem>
									<SelectItem value="month">Month</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="format">Export Format</Label>
							<Select
								value={format}
								onValueChange={(v) => setFormat(v as ReportFormat)}
							>
								<SelectTrigger id="format">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="pdf">PDF</SelectItem>
									<SelectItem value="csv">CSV</SelectItem>
									<SelectItem value="xlsx">Excel</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Report Types */}
			<div className="grid gap-4 md:grid-cols-2">
				{reportTypes.map((report) => (
					<Card key={report.id}>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<FileBarChart className="h-5 w-5" />
								{report.name}
							</CardTitle>
							<CardDescription>{report.description}</CardDescription>
						</CardHeader>
						<CardContent>
							<Button
								onClick={() => handleGenerate(report.id)}
								disabled={generateMutation.isPending}
								className="w-full"
							>
								{generateMutation.isPending ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Download className="mr-2 h-4 w-4" />
								)}
								Generate Report
							</Button>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Quick Link */}
			<div className="flex justify-center">
				<Button variant="outline" asChild>
					<Link to="/dashboard/reports">View Report History</Link>
				</Button>
			</div>
		</div>
	);
}

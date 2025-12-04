import { createFileRoute, redirect } from "@tanstack/react-router";
import { Calendar, FileBarChart, Loader2 } from "lucide-react";
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
import type { ApiError } from "@/hooks/use-reports";
import {
	type ReportType,
	useGenerateReport,
	useReportTypes,
} from "@/hooks/use-reports";
import { useUsers } from "@/hooks/use-users";
import { authClient } from "@/lib/auth-client";
import { normalizeSelectValue, SELECT_ALL_VALUE } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/reports/generate")({
	component: GenerateReportPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function GenerateReportPage() {
	const [reportType, setReportType] = useState<ReportType | "">("");
	const [format, setFormat] = useState<"json" | "csv" | "pdf" | "xlsx">("json");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [departmentId, setDepartmentId] = useState("");
	const [doctorId, setDoctorId] = useState("");
	const [patientType, setPatientType] = useState<"OPD" | "IPD" | "">("");
	const [groupBy, setGroupBy] = useState<"day" | "week" | "month" | "">("");

	const { data: reportTypesData, isLoading: reportTypesLoading } =
		useReportTypes();
	const generateMutation = useGenerateReport();

	// Fetch departments and doctors for dropdowns
	const { data: departmentsData } = useDepartments({ status: "ACTIVE" });
	const { data: doctorsData } = useUsers({ role: "DOCTOR", status: "ACTIVE" });

	const selectedReportType = reportTypesData?.reports.find(
		(r) => r.id === reportType,
	);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!reportType) {
			toast.error("Please select a report type");
			return;
		}

		// Validate date range
		if (startDate && endDate) {
			const start = new Date(startDate);
			const end = new Date(endDate);
			const daysDiff = Math.ceil(
				(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
			);

			if (end <= start) {
				toast.error("End date must be after start date");
				return;
			}

			if (daysDiff > 365) {
				toast.error("Date range cannot exceed 365 days");
				return;
			}
		}

		// Check required parameters
		const requiredParams =
			selectedReportType?.parameters.filter((p) => p.required) || [];
		const missingParams = requiredParams.filter((param) => {
			switch (param.name) {
				case "startDate":
					return !startDate;
				case "endDate":
					return !endDate;
				default:
					return false;
			}
		});

		if (missingParams.length > 0) {
			toast.error(
				`Missing required parameters: ${missingParams.map((p) => p.name).join(", ")}`,
			);
			return;
		}

		try {
			const normalizedPatientType = normalizeSelectValue(patientType);
			const normalizedGroupBy = normalizeSelectValue(groupBy);
			await generateMutation.mutateAsync({
				reportType,
				format,
				parameters: {
					startDate: startDate || undefined,
					endDate: endDate || undefined,
					departmentId: normalizeSelectValue(departmentId) || undefined,
					doctorId: normalizeSelectValue(doctorId) || undefined,
					patientType: (normalizedPatientType || undefined) as
						| "OPD"
						| "IPD"
						| undefined,
					groupBy: (normalizedGroupBy || undefined) as
						| "day"
						| "week"
						| "month"
						| undefined,
				},
			});
			toast.success("Report generation started successfully");
			// Reset form
			setReportType("");
			setStartDate("");
			setEndDate("");
			setDepartmentId("");
			setDoctorId("");
			setPatientType("");
			setGroupBy("");
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to generate report");
		}
	};

	const isDateRangeRequired = selectedReportType?.parameters.some(
		(p) => p.name === "startDate" && p.required,
	);

	return (
		<div className="flex flex-col gap-6 p-4 md:gap-8 md:p-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-2xl">Generate Report</h1>
					<p className="text-muted-foreground">
						Create a new report with custom parameters
					</p>
				</div>
			</div>

			{reportTypesLoading ? (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin" />
				</div>
			) : (
				<form onSubmit={handleSubmit} className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Report Configuration</CardTitle>
							<CardDescription>
								Select the report type and configure its parameters
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Report Type */}
							<div className="space-y-2">
								<Label htmlFor="report-type">Report Type *</Label>
								<Select
									value={reportType}
									onValueChange={(value: ReportType) => setReportType(value)}
								>
									<SelectTrigger id="report-type">
										<SelectValue placeholder="Select a report type" />
									</SelectTrigger>
									<SelectContent>
										{reportTypesData?.reports.map((report) => (
											<SelectItem key={report.id} value={report.id}>
												{report.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{selectedReportType && (
									<p className="text-muted-foreground text-sm">
										{selectedReportType.description}
									</p>
								)}
							</div>

							{/* Format */}
							<div className="space-y-2">
								<Label htmlFor="format">Export Format</Label>
								<Select
									value={format}
									onValueChange={(value: "json" | "csv" | "pdf" | "xlsx") =>
										setFormat(value)
									}
								>
									<SelectTrigger id="format">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="json">JSON</SelectItem>
										<SelectItem value="csv">CSV</SelectItem>
										<SelectItem value="pdf">PDF</SelectItem>
										<SelectItem value="xlsx">Excel</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Date Range */}
							{(isDateRangeRequired ||
								selectedReportType?.parameters.some(
									(p) => p.name === "startDate",
								)) && (
								<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="start-date">
											Start Date {isDateRangeRequired && "*"}
										</Label>
										<div className="relative">
											<Calendar className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
											<Input
												id="start-date"
												type="date"
												value={startDate}
												onChange={(e) => setStartDate(e.target.value)}
												className="pl-9"
												required={isDateRangeRequired}
											/>
										</div>
									</div>
									<div className="space-y-2">
										<Label htmlFor="end-date">
											End Date {isDateRangeRequired && "*"}
										</Label>
										<div className="relative">
											<Calendar className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
											<Input
												id="end-date"
												type="date"
												value={endDate}
												onChange={(e) => setEndDate(e.target.value)}
												className="pl-9"
												required={isDateRangeRequired}
											/>
										</div>
									</div>
								</div>
							)}

							{/* Optional Filters */}
							<div className="grid gap-4 md:grid-cols-2">
								{selectedReportType?.parameters.some(
									(p) => p.name === "departmentId",
								) && (
									<div className="space-y-2">
										<Label htmlFor="department">Department</Label>
										<Select
											value={departmentId}
											onValueChange={setDepartmentId}
										>
											<SelectTrigger id="department">
												<SelectValue placeholder="All departments" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={SELECT_ALL_VALUE}>
													All departments
												</SelectItem>
												{departmentsData?.data.map((dept) => (
													<SelectItem key={dept.id} value={dept.id}>
														{dept.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}

								{selectedReportType?.parameters.some(
									(p) => p.name === "doctorId",
								) && (
									<div className="space-y-2">
										<Label htmlFor="doctor">Doctor</Label>
										<Select value={doctorId} onValueChange={setDoctorId}>
											<SelectTrigger id="doctor">
												<SelectValue placeholder="All doctors" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={SELECT_ALL_VALUE}>
													All doctors
												</SelectItem>
												{doctorsData?.data.map((doctor) => (
													<SelectItem key={doctor.id} value={doctor.id}>
														Dr. {doctor.firstName} {doctor.lastName}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}

								{selectedReportType?.parameters.some(
									(p) => p.name === "patientType",
								) && (
									<div className="space-y-2">
										<Label htmlFor="patient-type">Patient Type</Label>
										<Select
											value={patientType}
											onValueChange={(value: "OPD" | "IPD") =>
												setPatientType(value)
											}
										>
											<SelectTrigger id="patient-type">
												<SelectValue placeholder="All types" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={SELECT_ALL_VALUE}>
													All types
												</SelectItem>
												<SelectItem value="OPD">OPD</SelectItem>
												<SelectItem value="IPD">IPD</SelectItem>
											</SelectContent>
										</Select>
									</div>
								)}

								{selectedReportType?.parameters.some(
									(p) => p.name === "groupBy",
								) && (
									<div className="space-y-2">
										<Label htmlFor="group-by">Group By</Label>
										<Select
											value={groupBy}
											onValueChange={(value: "day" | "week" | "month") =>
												setGroupBy(value)
											}
										>
											<SelectTrigger id="group-by">
												<SelectValue placeholder="No grouping" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={SELECT_ALL_VALUE}>
													No grouping
												</SelectItem>
												<SelectItem value="day">Day</SelectItem>
												<SelectItem value="week">Week</SelectItem>
												<SelectItem value="month">Month</SelectItem>
											</SelectContent>
										</Select>
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Actions */}
					<div className="flex gap-4">
						<Button type="submit" disabled={generateMutation.isPending}>
							{generateMutation.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Generating...
								</>
							) : (
								<>
									<FileBarChart className="mr-2 h-4 w-4" />
									Generate Report
								</>
							)}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setReportType("");
								setStartDate("");
								setEndDate("");
								setDepartmentId("");
								setDoctorId("");
								setPatientType("");
								setGroupBy("");
							}}
						>
							Clear
						</Button>
					</div>
				</form>
			)}
		</div>
	);
}

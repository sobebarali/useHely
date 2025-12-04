import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	ArrowLeft,
	Download,
	FileBarChart,
	Loader2,
	Users,
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
import {
	type ReportFormat,
	type ReportType,
	useGenerateReport,
} from "@/hooks/use-reports";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/reports-client";

export const Route = createFileRoute("/dashboard/reports/patients")({
	component: PatientReportsPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function PatientReportsPage() {
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");
	const [format, setFormat] = useState<ReportFormat>("pdf");

	const generateMutation = useGenerateReport();

	const handleGenerate = async (reportType: ReportType) => {
		try {
			const result = await generateMutation.mutateAsync({
				reportType,
				format,
				parameters: {
					startDate: startDate || undefined,
					endDate: endDate || undefined,
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
			id: "patient-registration",
			name: "Patient Registration",
			description: "List of newly registered patients within the date range",
		},
		{
			id: "patient-demographics",
			name: "Patient Demographics",
			description:
				"Overview of patient demographics including age, gender distribution",
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
						<Users className="h-6 w-6" />
						Patient Reports
					</h1>
					<p className="text-muted-foreground">
						Generate patient-related reports and analytics
					</p>
				</div>
			</div>

			{/* Filter Controls */}
			<Card>
				<CardHeader>
					<CardTitle>Report Parameters</CardTitle>
					<CardDescription>
						Set the date range and format for your reports
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 sm:grid-cols-3">
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

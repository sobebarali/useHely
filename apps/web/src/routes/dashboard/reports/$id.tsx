import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	AlertTriangle,
	Download,
	FileText,
	Loader2,
	RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { ApiError } from "@/hooks/use-reports";
import {
	type ReportStatus,
	useReport,
	useReportHistory,
} from "@/hooks/use-reports";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/reports/$id")({
	component: ReportDetailPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function getStatusBadgeVariant(
	status: ReportStatus,
): "default" | "secondary" | "destructive" | "outline" {
	switch (status) {
		case "COMPLETED":
			return "default";
		case "GENERATING":
			return "secondary";
		case "FAILED":
			return "destructive";
		case "PENDING":
		default:
			return "outline";
	}
}

function ReportDetailPage() {
	const { id } = Route.useParams();
	const [isDownloading, setIsDownloading] = useState(false);
	const { data: reportData, isLoading, error, refetch } = useReport(id);
	const { data: historyData } = useReportHistory({ limit: 100 }); // Get history to find parameters

	// Find the report in history to get parameters
	const reportHistory = historyData?.data.find((item) => item.reportId === id);

	const handleDownload = async () => {
		if (!reportData) return;

		setIsDownloading(true);
		try {
			// For now, just show a toast. In a real implementation, you'd download the file
			toast.success(`Downloading ${reportData.reportType} report...`);
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to download report");
		} finally {
			setIsDownloading(false);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (error) {
		const apiError = error as unknown as ApiError;
		return (
			<div className="flex flex-col gap-6 p-4 md:gap-8 md:p-6">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-destructive">
							<AlertTriangle className="h-5 w-5" />
							Report Not Found
						</CardTitle>
						<CardDescription>
							{apiError.code === "REPORT_EXPIRED"
								? "This report has expired and is no longer available."
								: apiError.message ||
									"The requested report could not be found."}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button variant="outline" onClick={() => window.history.back()}>
							Go Back
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!reportData) {
		return (
			<div className="flex items-center justify-center py-12">
				<p>Report not found</p>
			</div>
		);
	}

	// For now, we'll assume the report is completed since we don't have status in download response
	// In a real implementation, you'd fetch the report status from history endpoint
	const status: ReportStatus = reportHistory?.status || "COMPLETED";

	return (
		<div className="flex flex-col gap-6 p-4 md:gap-8 md:p-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-2xl">
						{reportData.reportType
							.replace(/-/g, " ")
							.replace(/\b\w/g, (l) => l.toUpperCase())}
					</h1>
					<p className="text-muted-foreground">
						Report details and download options
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => refetch()}>
						<RefreshCw className="mr-2 h-4 w-4" />
						Refresh
					</Button>
					{status === "COMPLETED" && (
						<Button onClick={handleDownload} disabled={isDownloading}>
							{isDownloading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Downloading...
								</>
							) : (
								<>
									<Download className="mr-2 h-4 w-4" />
									Download
								</>
							)}
						</Button>
					)}
				</div>
			</div>

			{/* Report Info */}
			<Card>
				<CardHeader>
					<CardTitle>Report Information</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<p className="text-muted-foreground text-sm">Report Type</p>
							<p className="font-medium">
								{reportData.reportType
									.replace(/-/g, " ")
									.replace(/\b\w/g, (l) => l.toUpperCase())}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground text-sm">Format</p>
							<Badge variant="outline">{reportData.format.toUpperCase()}</Badge>
						</div>
						<div>
							<p className="text-muted-foreground text-sm">Generated At</p>
							<p className="font-medium">
								{formatDate(reportData.generatedAt)}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground text-sm">Status</p>
							<Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Parameters */}
			{reportHistory?.parameters &&
				Object.keys(reportHistory.parameters).length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Parameters</CardTitle>
							<CardDescription>
								Filters and options used to generate this report
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid gap-4 md:grid-cols-2">
								{Object.entries(reportHistory.parameters).map(
									([key, value]) => (
										<div key={key}>
											<p className="text-muted-foreground text-sm capitalize">
												{key.replace(/([A-Z])/g, " $1").trim()}
											</p>
											<p className="font-medium">{String(value)}</p>
										</div>
									),
								)}
							</div>
						</CardContent>
					</Card>
				)}

			{/* Report Data Preview */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						Report Data
					</CardTitle>
					<CardDescription>
						Preview of the generated report data
					</CardDescription>
				</CardHeader>
				<CardContent>
					{status === "GENERATING" ? (
						<div className="flex items-center gap-2 py-8">
							<Loader2 className="h-6 w-6 animate-spin" />
							<p>Generating report...</p>
						</div>
					) : status === "FAILED" ? (
						<div className="flex items-center gap-2 py-8 text-destructive">
							<AlertTriangle className="h-6 w-6" />
							<p>Report generation failed</p>
						</div>
					) : status === "PENDING" ? (
						<div className="flex items-center gap-2 py-8">
							<Loader2 className="h-6 w-6 animate-spin" />
							<p>Report generation queued...</p>
						</div>
					) : (
						<div className="max-h-96 overflow-auto">
							<pre className="rounded-md bg-muted p-4 text-sm">
								{JSON.stringify(reportData.data, null, 2)}
							</pre>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

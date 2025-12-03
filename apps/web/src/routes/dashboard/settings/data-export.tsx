import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	AlertCircle,
	CheckCircle,
	Clock,
	Download,
	FileJson,
	FileText,
	Loader2,
	Package,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
	type ExportFormat,
	type ExportStatus,
	useDownloadExport,
	useExportStatus,
	useRequestDataExport,
} from "@/hooks/use-compliance";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/compliance-client";

export const Route = createFileRoute("/dashboard/settings/data-export")({
	component: DataExportPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function DataExportPage() {
	const [requestId, setRequestId] = useState<string | null>(null);
	const requestExportMutation = useRequestDataExport();
	const downloadExportMutation = useDownloadExport();

	// Fetch export status if we have a requestId
	const {
		data: exportStatus,
		isLoading: isLoadingStatus,
		error: statusError,
	} = useExportStatus(requestId || "", !!requestId);

	const form = useForm({
		defaultValues: {
			format: "json" as ExportFormat,
			includeAuditLog: true,
		},
		onSubmit: async ({ value }) => {
			try {
				const response = await requestExportMutation.mutateAsync({
					format: value.format,
					includeAuditLog: value.includeAuditLog,
				});
				setRequestId(response.requestId);
				toast.success("Data export request submitted successfully");
			} catch (error) {
				const apiError = error as ApiError;
				toast.error(apiError.message || "Failed to request data export");
			}
		},
	});

	const handleDownload = async () => {
		if (!requestId) return;

		try {
			const blob = await downloadExportMutation.mutateAsync(requestId);

			// Determine file extension based on format
			const extension = exportStatus?.format === "csv" ? "csv" : "json";
			const filename = `data-export-${new Date().toISOString().split("T")[0]}.${extension}`;

			// Create download link
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);

			toast.success("Export downloaded successfully");
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to download export");
		}
	};

	const handleNewRequest = () => {
		setRequestId(null);
		form.reset();
	};

	const getStatusInfo = (
		status: ExportStatus,
	): {
		label: string;
		icon: React.ReactNode;
		variant: "default" | "secondary" | "destructive" | "outline";
		description: string;
	} => {
		switch (status) {
			case "pending":
				return {
					label: "Pending",
					icon: <Clock className="h-4 w-4" />,
					variant: "secondary",
					description: "Your export request is queued for processing",
				};
			case "processing":
				return {
					label: "Processing",
					icon: <Loader2 className="h-4 w-4 animate-spin" />,
					variant: "default",
					description: "We're collecting your data for export",
				};
			case "completed":
				return {
					label: "Completed",
					icon: <CheckCircle className="h-4 w-4" />,
					variant: "default",
					description: "Your export is ready for download",
				};
			case "expired":
				return {
					label: "Expired",
					icon: <XCircle className="h-4 w-4" />,
					variant: "destructive",
					description:
						"Download link has expired. Please request a new export.",
				};
			case "failed":
				return {
					label: "Failed",
					icon: <AlertCircle className="h-4 w-4" />,
					variant: "destructive",
					description: "Export failed. Please try again or contact support.",
				};
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-semibold text-2xl tracking-tight">Data Export</h2>
				<p className="text-muted-foreground">
					Export all your personal data (GDPR Article 15 - Right of Access)
				</p>
			</div>

			<Separator />

			{!requestId ? (
				<>
					<Alert>
						<Package className="h-4 w-4" />
						<AlertDescription>
							Request a complete export of all your personal data. The export
							will be processed within 72 hours and will be available for
							download for 7 days.
						</AlertDescription>
					</Alert>

					<Card>
						<CardHeader>
							<div className="flex items-center gap-2">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
									<Download className="h-5 w-5 text-primary" />
								</div>
								<div>
									<CardTitle>Request Data Export</CardTitle>
									<CardDescription>
										Choose your export format and options
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									e.stopPropagation();
									form.handleSubmit();
								}}
								className="space-y-6"
							>
								<form.Field name="format">
									{(field) => (
										<div className="space-y-3">
											<Label>Export Format</Label>
											<RadioGroup
												value={field.state.value}
												onValueChange={(value: string) =>
													field.handleChange(value as ExportFormat)
												}
											>
												<div className="flex items-center space-x-2 rounded-lg border p-4">
													<RadioGroupItem value="json" id="json" />
													<Label
														htmlFor="json"
														className="flex flex-1 cursor-pointer items-center gap-3"
													>
														<FileJson className="h-5 w-5 text-muted-foreground" />
														<div>
															<p className="font-medium">JSON</p>
															<p className="text-muted-foreground text-sm">
																Machine-readable format, best for developers
															</p>
														</div>
													</Label>
												</div>
												<div className="flex items-center space-x-2 rounded-lg border p-4">
													<RadioGroupItem value="csv" id="csv" />
													<Label
														htmlFor="csv"
														className="flex flex-1 cursor-pointer items-center gap-3"
													>
														<FileText className="h-5 w-5 text-muted-foreground" />
														<div>
															<p className="font-medium">CSV</p>
															<p className="text-muted-foreground text-sm">
																Spreadsheet format, can be opened in Excel
															</p>
														</div>
													</Label>
												</div>
											</RadioGroup>
										</div>
									)}
								</form.Field>

								<form.Field name="includeAuditLog">
									{(field) => (
										<div className="flex items-start space-x-3 rounded-lg border p-4">
											<Checkbox
												id="includeAuditLog"
												checked={field.state.value}
												onCheckedChange={(checked) =>
													field.handleChange(checked === true)
												}
											/>
											<div className="flex-1">
												<Label
													htmlFor="includeAuditLog"
													className="cursor-pointer font-medium"
												>
													Include Access History
												</Label>
												<p className="text-muted-foreground text-sm">
													Include log of when and how your data was accessed
												</p>
											</div>
										</div>
									)}
								</form.Field>

								<form.Subscribe>
									{(state) => (
										<Button
											type="submit"
											disabled={
												!state.canSubmit ||
												state.isSubmitting ||
												requestExportMutation.isPending
											}
										>
											{state.isSubmitting || requestExportMutation.isPending ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Submitting request...
												</>
											) : (
												<>
													<Download className="mr-2 h-4 w-4" />
													Request Export
												</>
											)}
										</Button>
									)}
								</form.Subscribe>
							</form>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">What's Included</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-muted-foreground text-sm">
							<div className="flex items-start gap-2">
								<CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
								<div>
									<p className="font-medium text-foreground">Profile Data</p>
									<p>Name, email, phone, address, and other personal details</p>
								</div>
							</div>
							<div className="flex items-start gap-2">
								<CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
								<div>
									<p className="font-medium text-foreground">Account Data</p>
									<p>Created date, last login, preferences, and settings</p>
								</div>
							</div>
							<div className="flex items-start gap-2">
								<CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
								<div>
									<p className="font-medium text-foreground">Activity Data</p>
									<p>Login history, actions performed, and usage patterns</p>
								</div>
							</div>
							<div className="flex items-start gap-2">
								<CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
								<div>
									<p className="font-medium text-foreground">Consent Records</p>
									<p>All consent records with timestamps and history</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</>
			) : isLoadingStatus ? (
				<Card>
					<CardContent className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</CardContent>
				</Card>
			) : statusError ? (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						Failed to load export status. Please try again later.
					</AlertDescription>
				</Alert>
			) : exportStatus ? (
				<>
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle>Export Status</CardTitle>
									<CardDescription>Request ID: {requestId}</CardDescription>
								</div>
								<Badge variant={getStatusInfo(exportStatus.status).variant}>
									{getStatusInfo(exportStatus.status).icon}
									<span className="ml-2">
										{getStatusInfo(exportStatus.status).label}
									</span>
								</Badge>
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="rounded-lg border bg-muted/50 p-4">
								<p className="text-sm">
									{getStatusInfo(exportStatus.status).description}
								</p>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-1">
									<p className="text-muted-foreground text-sm">Format</p>
									<p className="font-medium">
										{exportStatus.format.toUpperCase()}
									</p>
								</div>
								<div className="space-y-1">
									<p className="text-muted-foreground text-sm">Requested On</p>
									<p className="font-medium">
										{new Date(exportStatus.createdAt).toLocaleString()}
									</p>
								</div>
								{exportStatus.completedAt && (
									<div className="space-y-1">
										<p className="text-muted-foreground text-sm">
											Completed On
										</p>
										<p className="font-medium">
											{new Date(exportStatus.completedAt).toLocaleString()}
										</p>
									</div>
								)}
								{exportStatus.expiresAt && (
									<div className="space-y-1">
										<p className="text-muted-foreground text-sm">Expires On</p>
										<p className="font-medium">
											{new Date(exportStatus.expiresAt).toLocaleString()}
										</p>
									</div>
								)}
								{exportStatus.fileSize && (
									<div className="space-y-1">
										<p className="text-muted-foreground text-sm">File Size</p>
										<p className="font-medium">
											{(exportStatus.fileSize / 1024).toFixed(2)} KB
										</p>
									</div>
								)}
							</div>

							<div className="flex gap-2">
								{exportStatus.status === "completed" && (
									<Button
										onClick={handleDownload}
										disabled={downloadExportMutation.isPending}
									>
										{downloadExportMutation.isPending ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Downloading...
											</>
										) : (
											<>
												<Download className="mr-2 h-4 w-4" />
												Download Export
											</>
										)}
									</Button>
								)}
								{(exportStatus.status === "expired" ||
									exportStatus.status === "failed") && (
									<Button onClick={handleNewRequest}>Request New Export</Button>
								)}
								{exportStatus.status === "completed" && (
									<Button variant="outline" onClick={handleNewRequest}>
										Request Another Export
									</Button>
								)}
							</div>
						</CardContent>
					</Card>

					{(exportStatus.status === "pending" ||
						exportStatus.status === "processing") && (
						<Alert>
							<Clock className="h-4 w-4" />
							<AlertDescription>
								Your export is being processed. This page will automatically
								update when the export is ready. You can safely close this page
								and return later.
							</AlertDescription>
						</Alert>
					)}
				</>
			) : null}
		</div>
	);
}

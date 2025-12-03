import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	AlertCircle,
	CheckCircle,
	Clock,
	FileDown,
	Filter,
	Loader2,
	ShieldCheck,
	Trash2,
	X,
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
	type AdminRequestAction,
	type ComplianceRequestListItem,
	type ListComplianceRequestsParams,
	type RequestType,
	useComplianceRequests,
	useProcessRequest,
} from "@/hooks/use-compliance";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/compliance-client";

export const Route = createFileRoute("/dashboard/admin/compliance")({
	component: AdminCompliancePage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
		// TODO: Add permission check for COMPLIANCE:READ
	},
});

function AdminCompliancePage() {
	const [filters, setFilters] = useState<ListComplianceRequestsParams>({
		page: 1,
		limit: 20,
		type: "all",
		status: "",
		startDate: "",
		endDate: "",
	});

	const { data, isLoading, error } = useComplianceRequests(filters);
	const [selectedRequest, setSelectedRequest] =
		useState<ComplianceRequestListItem | null>(null);
	const [actionDialogOpen, setActionDialogOpen] = useState(false);

	const handleFilterChange = (
		key: keyof ListComplianceRequestsParams,
		value: string,
	) => {
		setFilters((prev) => ({
			...prev,
			[key]: value,
			page: 1, // Reset to first page on filter change
		}));
	};

	const handlePageChange = (newPage: number) => {
		setFilters((prev) => ({ ...prev, page: newPage }));
	};

	const handleViewDetails = (request: ComplianceRequestListItem) => {
		setSelectedRequest(request);
		setActionDialogOpen(true);
	};

	const getRequestTypeIcon = (type: RequestType) => {
		return type === "EXPORT" ? (
			<FileDown className="h-4 w-4" />
		) : (
			<Trash2 className="h-4 w-4" />
		);
	};

	const getStatusBadge = (status: string) => {
		const statusMap: Record<
			string,
			{
				variant: "default" | "secondary" | "destructive" | "outline";
				label: string;
			}
		> = {
			pending: { variant: "secondary", label: "Pending" },
			pending_verification: {
				variant: "secondary",
				label: "Pending Verification",
			},
			verified: { variant: "default", label: "Verified" },
			processing: { variant: "default", label: "Processing" },
			completed: { variant: "outline", label: "Completed" },
			expired: { variant: "destructive", label: "Expired" },
			failed: { variant: "destructive", label: "Failed" },
			cancelled: { variant: "outline", label: "Cancelled" },
		};

		const statusInfo = statusMap[status] || {
			variant: "outline" as const,
			label: status,
		};

		return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-semibold text-2xl tracking-tight">
					Compliance Management
				</h2>
				<p className="text-muted-foreground">
					Manage data subject requests (GDPR compliance)
				</p>
			</div>

			<Separator />

			{/* Filters */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Filter className="h-5 w-5 text-muted-foreground" />
						<CardTitle>Filters</CardTitle>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-4">
						<div className="space-y-2">
							<Label>Request Type</Label>
							<Select
								value={filters.type || "all"}
								onValueChange={(value) =>
									handleFilterChange("type", value as RequestType | "all")
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="All types" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Types</SelectItem>
									<SelectItem value="EXPORT">Export</SelectItem>
									<SelectItem value="DELETION">Deletion</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Status</Label>
							<Select
								value={filters.status || ""}
								onValueChange={(value) => handleFilterChange("status", value)}
							>
								<SelectTrigger>
									<SelectValue placeholder="All statuses" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">All Statuses</SelectItem>
									<SelectItem value="pending">Pending</SelectItem>
									<SelectItem value="pending_verification">
										Pending Verification
									</SelectItem>
									<SelectItem value="verified">Verified</SelectItem>
									<SelectItem value="processing">Processing</SelectItem>
									<SelectItem value="completed">Completed</SelectItem>
									<SelectItem value="expired">Expired</SelectItem>
									<SelectItem value="failed">Failed</SelectItem>
									<SelectItem value="cancelled">Cancelled</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Start Date</Label>
							<Input
								type="date"
								value={filters.startDate || ""}
								onChange={(e) =>
									handleFilterChange("startDate", e.target.value)
								}
							/>
						</div>

						<div className="space-y-2">
							<Label>End Date</Label>
							<Input
								type="date"
								value={filters.endDate || ""}
								onChange={(e) => handleFilterChange("endDate", e.target.value)}
							/>
						</div>
					</div>

					<div className="mt-4 flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setFilters({
									page: 1,
									limit: 20,
									type: "all",
									status: "",
									startDate: "",
									endDate: "",
								})
							}
						>
							<X className="mr-2 h-4 w-4" />
							Clear Filters
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Stats */}
			{data && (
				<div className="grid gap-4 md:grid-cols-4">
					<Card>
						<CardHeader className="pb-3">
							<CardDescription>Total Requests</CardDescription>
							<CardTitle className="text-3xl">
								{data.pagination.total}
							</CardTitle>
						</CardHeader>
					</Card>
					<Card>
						<CardHeader className="pb-3">
							<CardDescription>Current Page</CardDescription>
							<CardTitle className="text-3xl">
								{data.pagination.page} / {data.pagination.totalPages}
							</CardTitle>
						</CardHeader>
					</Card>
				</div>
			)}

			{/* Requests Table */}
			<Card>
				<CardHeader>
					<CardTitle>Data Subject Requests</CardTitle>
					<CardDescription>
						View and manage all GDPR compliance requests
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					) : error ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<AlertCircle className="mb-2 h-8 w-8 text-muted-foreground" />
							<p className="text-muted-foreground">
								Failed to load requests. Please try again.
							</p>
						</div>
					) : data && data.data.length > 0 ? (
						<>
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Type</TableHead>
											<TableHead>User</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Created</TableHead>
											<TableHead>Completed</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.data.map((request) => (
											<TableRow key={request.requestId}>
												<TableCell>
													<div className="flex items-center gap-2">
														{getRequestTypeIcon(request.type)}
														<span className="font-medium">{request.type}</span>
													</div>
												</TableCell>
												<TableCell>
													<div>
														<p className="font-medium">{request.userName}</p>
														<p className="text-muted-foreground text-sm">
															{request.userEmail}
														</p>
													</div>
												</TableCell>
												<TableCell>{getStatusBadge(request.status)}</TableCell>
												<TableCell>
													<div className="flex items-center gap-1 text-sm">
														<Clock className="h-3 w-3 text-muted-foreground" />
														{new Date(request.createdAt).toLocaleDateString()}
													</div>
												</TableCell>
												<TableCell>
													{request.completedAt ? (
														<div className="flex items-center gap-1 text-sm">
															<CheckCircle className="h-3 w-3 text-green-600" />
															{new Date(
																request.completedAt,
															).toLocaleDateString()}
														</div>
													) : (
														<span className="text-muted-foreground text-sm">
															-
														</span>
													)}
												</TableCell>
												<TableCell className="text-right">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleViewDetails(request)}
													>
														View Details
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{/* Pagination */}
							<div className="mt-4 flex items-center justify-between">
								<p className="text-muted-foreground text-sm">
									Showing{" "}
									{(data.pagination.page - 1) * data.pagination.limit + 1} to{" "}
									{Math.min(
										data.pagination.page * data.pagination.limit,
										data.pagination.total,
									)}{" "}
									of {data.pagination.total} results
								</p>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => handlePageChange(data.pagination.page - 1)}
										disabled={data.pagination.page === 1}
									>
										Previous
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => handlePageChange(data.pagination.page + 1)}
										disabled={
											data.pagination.page === data.pagination.totalPages
										}
									>
										Next
									</Button>
								</div>
							</div>
						</>
					) : (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<ShieldCheck className="mb-2 h-8 w-8 text-muted-foreground" />
							<p className="text-muted-foreground">No requests found</p>
							<p className="text-muted-foreground text-sm">
								Try adjusting your filters
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Action Dialog */}
			{selectedRequest && (
				<RequestActionDialog
					request={selectedRequest}
					open={actionDialogOpen}
					onOpenChange={setActionDialogOpen}
				/>
			)}
		</div>
	);
}

interface RequestActionDialogProps {
	request: ComplianceRequestListItem;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function RequestActionDialog({
	request,
	open,
	onOpenChange,
}: RequestActionDialogProps) {
	const processRequestMutation = useProcessRequest();

	const form = useForm({
		defaultValues: {
			action: "" as AdminRequestAction | "",
			notes: "",
		},
		onSubmit: async ({ value }) => {
			if (!value.action) {
				toast.error("Please select an action");
				return;
			}

			try {
				await processRequestMutation.mutateAsync({
					requestId: request.requestId,
					data: {
						action: value.action,
						notes: value.notes || undefined,
					},
				});
				toast.success(`Request ${value.action}d successfully`);
				onOpenChange(false);
			} catch (error) {
				const apiError = error as ApiError;
				toast.error(apiError.message || "Failed to process request");
			}
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Request Details</DialogTitle>
					<DialogDescription>
						View and process data subject request
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Request Info */}
					<div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">Request ID</p>
							<p className="font-mono text-sm">{request.requestId}</p>
						</div>
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">Type</p>
							<div className="flex items-center gap-2">
								{request.type === "EXPORT" ? (
									<FileDown className="h-4 w-4" />
								) : (
									<Trash2 className="h-4 w-4" />
								)}
								<p className="font-medium">{request.type}</p>
							</div>
						</div>
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">User</p>
							<p className="font-medium">{request.userName}</p>
							<p className="text-muted-foreground text-sm">
								{request.userEmail}
							</p>
						</div>
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">Status</p>
							<Badge>{request.status.replace(/_/g, " ").toUpperCase()}</Badge>
						</div>
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">Created</p>
							<p className="text-sm">
								{new Date(request.createdAt).toLocaleString()}
							</p>
						</div>
						{request.completedAt && (
							<div className="space-y-1">
								<p className="text-muted-foreground text-sm">Completed</p>
								<p className="text-sm">
									{new Date(request.completedAt).toLocaleString()}
								</p>
							</div>
						)}
					</div>

					{/* Admin Notes */}
					{request.adminNotes && (
						<div className="rounded-lg border p-4">
							<p className="mb-2 font-medium text-sm">Previous Admin Notes</p>
							<p className="text-muted-foreground text-sm">
								{request.adminNotes}
							</p>
						</div>
					)}

					<Separator />

					{/* Process Form */}
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-4"
					>
						<form.Field name="action">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Action</Label>
									<Select
										value={field.state.value}
										onValueChange={(value) =>
											field.handleChange(value as AdminRequestAction)
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select an action" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="approve">Approve</SelectItem>
											<SelectItem value="reject">Reject</SelectItem>
											<SelectItem value="expedite">Expedite</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>

						<form.Field name="notes">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Admin Notes (Optional)</Label>
									<Textarea
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="Add any notes about this action..."
										rows={3}
									/>
								</div>
							)}
						</form.Field>

						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<form.Subscribe>
								{(state) => (
									<Button
										type="submit"
										disabled={
											!state.canSubmit ||
											state.isSubmitting ||
											processRequestMutation.isPending
										}
									>
										{state.isSubmitting || processRequestMutation.isPending ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Processing...
											</>
										) : (
											"Process Request"
										)}
									</Button>
								)}
							</form.Subscribe>
						</div>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}

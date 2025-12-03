import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	AlertTriangle,
	CheckCircle,
	Clock,
	Loader2,
	Mail,
	Shield,
	Trash2,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
	type DeletionStatus,
	useCancelDeletion,
	useDeletionStatus,
	useRequestDataDeletion,
	useVerifyDeletion,
} from "@/hooks/use-compliance";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/compliance-client";

export const Route = createFileRoute("/dashboard/settings/data-deletion")({
	component: DataDeletionPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function DataDeletionPage() {
	const [requestId, setRequestId] = useState<string | null>(null);
	const [verificationStep, setVerificationStep] = useState(false);
	const requestDeletionMutation = useRequestDataDeletion();
	const verifyDeletionMutation = useVerifyDeletion();
	const cancelDeletionMutation = useCancelDeletion();

	// Fetch deletion status if we have a requestId
	const {
		data: deletionStatus,
		isLoading: isLoadingStatus,
		error: statusError,
	} = useDeletionStatus(requestId || "", !!requestId);

	const requestForm = useForm({
		defaultValues: {
			confirmEmail: "",
			reason: "" as string | undefined,
		},
		onSubmit: async ({ value }) => {
			try {
				const response = await requestDeletionMutation.mutateAsync({
					confirmEmail: value.confirmEmail,
					reason: value.reason || undefined,
				});
				setRequestId(response.requestId);
				setVerificationStep(true);
				toast.success(
					"Deletion request submitted. Please check your email to verify.",
				);
			} catch (error) {
				const apiError = error as ApiError;
				toast.error(apiError.message || "Failed to request data deletion");
			}
		},
	});

	const verifyForm = useForm({
		defaultValues: {
			token: "",
		},
		onSubmit: async ({ value }) => {
			if (!requestId) return;

			try {
				await verifyDeletionMutation.mutateAsync({
					requestId,
					token: value.token,
				});
				setVerificationStep(false);
				toast.success("Deletion request verified. Grace period has started.");
			} catch (error) {
				const apiError = error as ApiError;
				toast.error(apiError.message || "Failed to verify deletion request");
			}
		},
	});

	const handleCancelDeletion = async () => {
		if (!requestId) return;

		try {
			await cancelDeletionMutation.mutateAsync(requestId);
			toast.success("Deletion request cancelled successfully");
			handleNewRequest();
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to cancel deletion request");
		}
	};

	const handleNewRequest = () => {
		setRequestId(null);
		setVerificationStep(false);
		requestForm.reset();
		verifyForm.reset();
	};

	const getStatusInfo = (
		status: DeletionStatus,
	): {
		label: string;
		icon: React.ReactNode;
		variant: "default" | "secondary" | "destructive" | "outline";
		description: string;
	} => {
		switch (status) {
			case "pending_verification":
				return {
					label: "Pending Verification",
					icon: <Mail className="h-4 w-4" />,
					variant: "secondary",
					description:
						"Check your email and enter the verification token to proceed",
				};
			case "verification_expired":
				return {
					label: "Verification Expired",
					icon: <XCircle className="h-4 w-4" />,
					variant: "destructive",
					description:
						"Verification expired. Please submit a new deletion request.",
				};
			case "verified":
				return {
					label: "Verified - Grace Period",
					icon: <Clock className="h-4 w-4" />,
					variant: "default",
					description:
						"Your request has been verified. You can cancel within the grace period.",
				};
			case "pending_deletion":
				return {
					label: "Pending Deletion",
					icon: <AlertTriangle className="h-4 w-4" />,
					variant: "destructive",
					description:
						"Grace period ended. Your data will be permanently deleted soon.",
				};
			case "completed":
				return {
					label: "Completed",
					icon: <CheckCircle className="h-4 w-4" />,
					variant: "destructive",
					description: "Your data has been permanently deleted.",
				};
			case "cancelled":
				return {
					label: "Cancelled",
					icon: <Shield className="h-4 w-4" />,
					variant: "secondary",
					description: "Deletion request was cancelled. Your data is safe.",
				};
		}
	};

	const getDaysRemaining = (gracePeriodEnds?: string): number => {
		if (!gracePeriodEnds) return 0;
		const now = new Date();
		const end = new Date(gracePeriodEnds);
		const diff = end.getTime() - now.getTime();
		return Math.ceil(diff / (1000 * 60 * 60 * 24));
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-semibold text-2xl tracking-tight">Data Deletion</h2>
				<p className="text-muted-foreground">
					Request permanent deletion of your account and data (GDPR Article 17 -
					Right to Erasure)
				</p>
			</div>

			<Separator />

			{!requestId ? (
				<>
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>Warning: This action is permanent</AlertTitle>
						<AlertDescription>
							Requesting data deletion will permanently remove all your personal
							data after a 30-day grace period. This action cannot be undone
							after the grace period ends.
						</AlertDescription>
					</Alert>

					<Card>
						<CardHeader>
							<div className="flex items-center gap-2">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
									<Trash2 className="h-5 w-5 text-destructive" />
								</div>
								<div>
									<CardTitle>Request Account Deletion</CardTitle>
									<CardDescription>
										Permanently delete your account and all associated data
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									e.stopPropagation();
									requestForm.handleSubmit();
								}}
								className="space-y-4"
							>
								<requestForm.Field name="confirmEmail">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>
												Confirm Your Email Address
											</Label>
											<Input
												id={field.name}
												name={field.name}
												type="email"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="Enter your email address"
											/>
											{field.state.meta.errors.length > 0 && (
												<p className="text-destructive text-sm">
													{String(field.state.meta.errors[0])}
												</p>
											)}
										</div>
									)}
								</requestForm.Field>

								<requestForm.Field name="reason">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>
												Reason for Deletion (Optional)
											</Label>
											<Textarea
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="Help us improve by sharing why you're leaving..."
												rows={4}
											/>
										</div>
									)}
								</requestForm.Field>

								<div className="rounded-lg border bg-muted/50 p-4">
									<h4 className="mb-2 font-medium text-sm">
										What happens next?
									</h4>
									<ol className="ml-4 list-decimal space-y-2 text-muted-foreground text-sm">
										<li>We'll send a verification email to your address</li>
										<li>Verify your request within 48 hours</li>
										<li>30-day grace period begins (you can cancel anytime)</li>
										<li>After 30 days, your data is permanently deleted</li>
									</ol>
								</div>

								<requestForm.Subscribe>
									{(state) => (
										<Button
											type="submit"
											variant="destructive"
											disabled={
												!state.canSubmit ||
												state.isSubmitting ||
												requestDeletionMutation.isPending
											}
										>
											{state.isSubmitting ||
											requestDeletionMutation.isPending ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Submitting request...
												</>
											) : (
												<>
													<Trash2 className="mr-2 h-4 w-4" />
													Request Deletion
												</>
											)}
										</Button>
									)}
								</requestForm.Subscribe>
							</form>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">What will be deleted?</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-muted-foreground text-sm">
							<div className="flex items-start gap-2">
								<XCircle className="mt-0.5 h-4 w-4 text-red-600" />
								<div>
									<p className="font-medium text-foreground">Personal Data</p>
									<p>
										All profile information, contact details, and preferences
									</p>
								</div>
							</div>
							<div className="flex items-start gap-2">
								<XCircle className="mt-0.5 h-4 w-4 text-red-600" />
								<div>
									<p className="font-medium text-foreground">Account Access</p>
									<p>You will no longer be able to log in to your account</p>
								</div>
							</div>
							<div className="flex items-start gap-2">
								<XCircle className="mt-0.5 h-4 w-4 text-red-600" />
								<div>
									<p className="font-medium text-foreground">
										Activity History
									</p>
									<p>All records of your actions and usage of the platform</p>
								</div>
							</div>
							<div className="flex items-start gap-2">
								<Shield className="mt-0.5 h-4 w-4 text-blue-600" />
								<div>
									<p className="font-medium text-foreground">
										Legal Records (Retained)
									</p>
									<p>
										Minimal data required by law (consent history, audit logs)
										will be retained for 6 years
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</>
			) : verificationStep ? (
				<>
					<Alert>
						<Mail className="h-4 w-4" />
						<AlertTitle>Check Your Email</AlertTitle>
						<AlertDescription>
							We've sent a verification token to your email address. Please
							enter it below to confirm your deletion request.
						</AlertDescription>
					</Alert>

					<Card>
						<CardHeader>
							<CardTitle>Verify Deletion Request</CardTitle>
							<CardDescription>
								Enter the verification token from your email
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									e.stopPropagation();
									verifyForm.handleSubmit();
								}}
								className="space-y-4"
							>
								<verifyForm.Field name="token">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Verification Token</Label>
											<Input
												id={field.name}
												name={field.name}
												type="text"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="Enter the token from your email"
											/>
											{field.state.meta.errors.length > 0 && (
												<p className="text-destructive text-sm">
													{String(field.state.meta.errors[0])}
												</p>
											)}
										</div>
									)}
								</verifyForm.Field>

								<div className="rounded-lg border bg-muted/50 p-3">
									<p className="text-sm">
										<strong>Note:</strong> The verification token is valid for
										48 hours. If you don't verify within this time, you'll need
										to submit a new deletion request.
									</p>
								</div>

								<div className="flex gap-2">
									<verifyForm.Subscribe>
										{(state) => (
											<Button
												type="submit"
												disabled={
													!state.canSubmit ||
													state.isSubmitting ||
													verifyDeletionMutation.isPending
												}
											>
												{state.isSubmitting ||
												verifyDeletionMutation.isPending ? (
													<>
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
														Verifying...
													</>
												) : (
													"Verify Request"
												)}
											</Button>
										)}
									</verifyForm.Subscribe>
									<Button variant="outline" onClick={handleNewRequest}>
										Cancel Request
									</Button>
								</div>
							</form>
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
					<AlertTriangle className="h-4 w-4" />
					<AlertDescription>
						Failed to load deletion status. Please try again later.
					</AlertDescription>
				</Alert>
			) : deletionStatus ? (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>Deletion Status</CardTitle>
								<CardDescription>Request ID: {requestId}</CardDescription>
							</div>
							<Badge variant={getStatusInfo(deletionStatus.status).variant}>
								{getStatusInfo(deletionStatus.status).icon}
								<span className="ml-2">
									{getStatusInfo(deletionStatus.status).label}
								</span>
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="rounded-lg border bg-muted/50 p-4">
							<p className="text-sm">
								{getStatusInfo(deletionStatus.status).description}
							</p>
						</div>

						{deletionStatus.status === "verified" &&
							deletionStatus.gracePeriodEnds && (
								<Alert>
									<Clock className="h-4 w-4" />
									<AlertTitle>Grace Period Active</AlertTitle>
									<AlertDescription>
										You have{" "}
										<strong>
											{getDaysRemaining(deletionStatus.gracePeriodEnds)} days
										</strong>{" "}
										remaining to cancel this request. After{" "}
										{new Date(
											deletionStatus.gracePeriodEnds,
										).toLocaleDateString()}
										, your data will be permanently deleted.
									</AlertDescription>
								</Alert>
							)}

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-1">
								<p className="text-muted-foreground text-sm">Requested On</p>
								<p className="font-medium">
									{new Date(deletionStatus.createdAt).toLocaleString()}
								</p>
							</div>
							{deletionStatus.verifiedAt && (
								<div className="space-y-1">
									<p className="text-muted-foreground text-sm">Verified On</p>
									<p className="font-medium">
										{new Date(deletionStatus.verifiedAt).toLocaleString()}
									</p>
								</div>
							)}
							{deletionStatus.gracePeriodEnds && (
								<div className="space-y-1">
									<p className="text-muted-foreground text-sm">
										Grace Period Ends
									</p>
									<p className="font-medium">
										{new Date(deletionStatus.gracePeriodEnds).toLocaleString()}
									</p>
								</div>
							)}
							{deletionStatus.completedAt && (
								<div className="space-y-1">
									<p className="text-muted-foreground text-sm">Completed On</p>
									<p className="font-medium">
										{new Date(deletionStatus.completedAt).toLocaleString()}
									</p>
								</div>
							)}
						</div>

						<div className="flex gap-2">
							{deletionStatus.canCancel && (
								<Button
									variant="destructive"
									onClick={handleCancelDeletion}
									disabled={cancelDeletionMutation.isPending}
								>
									{cancelDeletionMutation.isPending ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Cancelling...
										</>
									) : (
										<>
											<Shield className="mr-2 h-4 w-4" />
											Cancel Deletion
										</>
									)}
								</Button>
							)}
							{(deletionStatus.status === "verification_expired" ||
								deletionStatus.status === "cancelled") && (
								<Button onClick={handleNewRequest}>Submit New Request</Button>
							)}
						</div>
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}

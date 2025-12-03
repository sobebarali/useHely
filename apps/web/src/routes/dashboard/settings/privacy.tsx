import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	AlertCircle,
	Check,
	Clock,
	History,
	Loader2,
	Shield,
	X,
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
	type ConsentHistoryEntry,
	type ConsentPurpose,
	type ConsentRecord,
	useConsentHistory,
	useConsents,
	useRecordConsent,
	useWithdrawConsent,
} from "@/hooks/use-compliance";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/compliance-client";

export const Route = createFileRoute("/dashboard/settings/privacy")({
	component: PrivacySettingsPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function PrivacySettingsPage() {
	const { data: consents, isLoading } = useConsents();
	const recordConsentMutation = useRecordConsent();
	const withdrawConsentMutation = useWithdrawConsent();

	const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
	const [selectedPurpose, setSelectedPurpose] = useState<ConsentPurpose | null>(
		null,
	);

	const handleToggleConsent = async (consent: ConsentRecord) => {
		// Prevent toggling required consents
		if (consent.required) {
			toast.error("This consent is required and cannot be withdrawn");
			return;
		}

		try {
			if (consent.granted) {
				// Withdraw consent
				await withdrawConsentMutation.mutateAsync(consent.id);
				toast.success("Consent withdrawn successfully");
			} else {
				// Grant consent
				await recordConsentMutation.mutateAsync({
					purpose: consent.purpose,
					granted: true,
					source: "settings",
				});
				toast.success("Consent granted successfully");
			}
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to update consent");
		}
	};

	const handleViewHistory = (purpose: ConsentPurpose) => {
		setSelectedPurpose(purpose);
		setHistoryDialogOpen(true);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			<div>
				<h2 className="font-semibold text-2xl tracking-tight">
					Privacy & Consent
				</h2>
				<p className="text-muted-foreground">
					Manage your privacy preferences and data usage consent
				</p>
			</div>

			<Separator />

			<Alert>
				<Shield className="h-4 w-4" />
				<AlertDescription>
					You have control over how your data is used. Required consents are
					necessary for the platform to function, while optional consents can be
					withdrawn at any time.
				</AlertDescription>
			</Alert>

			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
							<Shield className="h-5 w-5 text-primary" />
						</div>
						<div>
							<CardTitle>Consent Management</CardTitle>
							<CardDescription>
								Control how your personal data is used
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					{consents?.map((consent) => (
						<div
							key={consent.id}
							className="flex flex-col space-y-3 rounded-lg border p-4"
						>
							<div className="flex items-start justify-between">
								<div className="flex-1 space-y-1">
									<div className="flex items-center gap-2">
										<Label
											htmlFor={consent.purpose}
											className="font-medium text-base"
										>
											{consent.purposeName}
										</Label>
										{consent.required && (
											<Badge variant="secondary" className="text-xs">
												Required
											</Badge>
										)}
										{consent.granted && !consent.required && (
											<Badge variant="default" className="text-xs">
												<Check className="mr-1 h-3 w-3" />
												Active
											</Badge>
										)}
									</div>
									<p className="text-muted-foreground text-sm">
										{consent.description}
									</p>
									{consent.grantedAt && (
										<div className="flex items-center gap-1 text-muted-foreground text-xs">
											<Clock className="h-3 w-3" />
											<span>
												{consent.granted
													? `Granted on ${new Date(consent.grantedAt).toLocaleDateString()}`
													: consent.withdrawnAt
														? `Withdrawn on ${new Date(consent.withdrawnAt).toLocaleDateString()}`
														: ""}
											</span>
										</div>
									)}
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleViewHistory(consent.purpose)}
									>
										<History className="h-4 w-4" />
									</Button>
									<Switch
										id={consent.purpose}
										checked={consent.granted}
										disabled={
											consent.required ||
											recordConsentMutation.isPending ||
											withdrawConsentMutation.isPending
										}
										onCheckedChange={() => handleToggleConsent(consent)}
									/>
								</div>
							</div>
						</div>
					))}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">About Data Usage</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 text-muted-foreground text-sm">
					<div>
						<h4 className="mb-2 font-medium text-foreground">
							Required Consents
						</h4>
						<p>
							These consents are essential for the platform to function and
							cannot be withdrawn. They cover basic functionality and legal
							obligations.
						</p>
					</div>
					<div>
						<h4 className="mb-2 font-medium text-foreground">
							Optional Consents
						</h4>
						<p>
							These consents enhance your experience but are not required. You
							can withdraw them at any time without affecting core
							functionality.
						</p>
					</div>
					<div>
						<h4 className="mb-2 font-medium text-foreground">
							Processing Timeline
						</h4>
						<p>
							Changes to your consent preferences take effect immediately. Any
							data processing based on withdrawn consent will stop within 24
							hours.
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Consent History Dialog */}
			{selectedPurpose && (
				<ConsentHistoryDialog
					purpose={selectedPurpose}
					open={historyDialogOpen}
					onOpenChange={setHistoryDialogOpen}
				/>
			)}
		</div>
	);
}

interface ConsentHistoryDialogProps {
	purpose: ConsentPurpose;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function ConsentHistoryDialog({
	purpose,
	open,
	onOpenChange,
}: ConsentHistoryDialogProps) {
	const { data: history, isLoading } = useConsentHistory(purpose, open);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Consent History</DialogTitle>
					<DialogDescription>
						{history?.purposeName} - Complete history of consent changes
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
							<div className="flex-1">
								<p className="font-medium text-sm">Current Status</p>
								<p className="text-muted-foreground text-xs">
									{history?.purposeName}
								</p>
							</div>
							{history?.currentStatus ? (
								<Badge variant="default">
									<Check className="mr-1 h-3 w-3" />
									Granted
								</Badge>
							) : (
								<Badge variant="secondary">
									<X className="mr-1 h-3 w-3" />
									Not Granted
								</Badge>
							)}
						</div>

						<div className="space-y-2">
							<h4 className="font-medium text-sm">Activity History</h4>
							{history?.history && history.history.length > 0 ? (
								<div className="space-y-2">
									{history.history.map((entry: ConsentHistoryEntry) => (
										<div
											key={entry.id}
											className="flex items-start gap-3 rounded-lg border p-3"
										>
											<div
												className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${
													entry.action === "GRANTED"
														? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
														: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
												}`}
											>
												{entry.action === "GRANTED" ? (
													<Check className="h-4 w-4" />
												) : (
													<X className="h-4 w-4" />
												)}
											</div>
											<div className="flex-1 space-y-1">
												<div className="flex items-center justify-between">
													<p className="font-medium text-sm">
														{entry.action === "GRANTED"
															? "Consent Granted"
															: "Consent Withdrawn"}
													</p>
													<Badge variant="outline" className="text-xs">
														{entry.source}
													</Badge>
												</div>
												<p className="text-muted-foreground text-xs">
													{new Date(entry.timestamp).toLocaleString()}
												</p>
												<p className="text-muted-foreground text-xs">
													IP: {entry.ipAddress}
												</p>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
									<AlertCircle className="mb-2 h-8 w-8 text-muted-foreground" />
									<p className="text-muted-foreground text-sm">
										No history available
									</p>
								</div>
							)}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

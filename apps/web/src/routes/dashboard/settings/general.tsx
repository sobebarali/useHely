import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	Calendar,
	CreditCard,
	ExternalLink,
	Loader2,
	Settings,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-auth";
import {
	type BillingSubscription,
	type SubscriptionStatus,
	useBillingPortal,
	useBillingSubscription,
} from "@/hooks/use-billing";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/settings/general")({
	component: GeneralSettingsPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function GeneralSettingsPage() {
	const { data: session } = useSession();
	const { data: subscription, isLoading, error } = useBillingSubscription();
	const billingPortalMutation = useBillingPortal();

	const hasSubscriptionAccess =
		session?.permissions?.includes("SUBSCRIPTION:READ") ?? false;
	const hasBillingAccess =
		(session?.permissions?.includes("BILLING:READ") ||
			session?.permissions?.includes("BILLING:MANAGE")) ??
		false;

	const handleOpenBillingPortal = async () => {
		try {
			const response = await billingPortalMutation.mutateAsync();
			window.open(response.url, "_blank");
		} catch (error) {
			toast.error("Failed to open billing portal");
		}
	};

	if (isLoading) {
		return <GeneralSettingsPageSkeleton />;
	}

	if (!hasSubscriptionAccess) {
		return (
			<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
				<div>
					<h1 className="font-bold text-2xl">General Settings</h1>
					<p className="text-muted-foreground">
						Configure general application settings
					</p>
				</div>
				<Alert>
					<Settings className="h-4 w-4" />
					<AlertDescription>
						You don't have permission to view subscription details. Contact your
						administrator for access.
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
				<div>
					<h1 className="font-bold text-2xl">General Settings</h1>
					<p className="text-muted-foreground">
						Configure general application settings
					</p>
				</div>
				<Alert variant="destructive">
					<Settings className="h-4 w-4" />
					<AlertDescription>
						Failed to load subscription information. Please try again later.
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			<div>
				<h1 className="font-bold text-2xl">General Settings</h1>
				<p className="text-muted-foreground">
					Configure general application settings and view subscription
					information
				</p>
			</div>

			{subscription && (
				<SubscriptionInformationCard
					subscription={subscription}
					hasBillingAccess={hasBillingAccess}
					onOpenPortal={handleOpenBillingPortal}
					isLoadingPortal={billingPortalMutation.isPending}
				/>
			)}

			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
							<Settings className="h-5 w-5 text-primary" />
						</div>
						<div>
							<CardTitle>Application Information</CardTitle>
							<CardDescription>
								System status and version details
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-1">
							<Label className="text-muted-foreground text-xs">Version</Label>
							<p className="font-medium">1.0.0</p>
						</div>
						<div className="space-y-1">
							<Label className="text-muted-foreground text-xs">Status</Label>
							<div>
								<Badge variant="default">Operational</Badge>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

interface SubscriptionInformationCardProps {
	subscription: BillingSubscription;
	hasBillingAccess: boolean;
	onOpenPortal: () => void;
	isLoadingPortal: boolean;
}

function SubscriptionInformationCard({
	subscription,
	hasBillingAccess,
	onOpenPortal,
	isLoadingPortal,
}: SubscriptionInformationCardProps) {
	const statusVariant = getStatusVariant(subscription.status);
	const isFree = subscription.plan === "FREE";

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
								<CreditCard className="h-5 w-5 text-primary" />
							</div>
							<div>
								<CardTitle>Subscription Details</CardTitle>
								<CardDescription>
									Your current plan and billing information
								</CardDescription>
							</div>
						</div>
						<Badge variant={statusVariant}>{subscription.status}</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<div className="space-y-1">
							<Label className="text-muted-foreground text-xs">
								Current Plan
							</Label>
							<p className="font-semibold text-lg">{subscription.plan}</p>
						</div>
						<div className="space-y-1">
							<Label className="text-muted-foreground text-xs">
								Billing Cycle
							</Label>
							<p className="font-medium">
								{isFree ? "N/A" : subscription.billingCycle}
							</p>
						</div>
						{!isFree && (
							<div className="space-y-1">
								<Label className="text-muted-foreground text-xs">Amount</Label>
								<p className="font-medium">
									{subscription.currency}{" "}
									{(subscription.amount / 100).toFixed(2)}
									<span className="text-muted-foreground text-sm">
										/
										{subscription.billingCycle === "MONTHLY" ? "month" : "year"}
									</span>
								</p>
							</div>
						)}
					</div>

					<Separator />

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex items-start gap-3">
							<Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
							<div className="space-y-1">
								<Label className="text-muted-foreground text-xs">
									Current Period
								</Label>
								<p className="text-sm">
									{new Date(
										subscription.currentPeriodStart,
									).toLocaleDateString()}{" "}
									-{" "}
									{new Date(subscription.currentPeriodEnd).toLocaleDateString()}
								</p>
							</div>
						</div>
						{!isFree && subscription.nextBillingDate && (
							<div className="flex items-start gap-3">
								<Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
								<div className="space-y-1">
									<Label className="text-muted-foreground text-xs">
										Next Billing Date
									</Label>
									<p className="text-sm">
										{new Date(
											subscription.nextBillingDate,
										).toLocaleDateString()}
									</p>
								</div>
							</div>
						)}
					</div>

					{subscription.cancelledAt && subscription.cancellationReason && (
						<Alert variant="destructive">
							<AlertDescription>
								<p className="font-medium">
									Subscription cancelled on{" "}
									{new Date(subscription.cancelledAt).toLocaleDateString()}
								</p>
								<p className="text-sm">
									Reason: {subscription.cancellationReason}
								</p>
								{subscription.gracePeriodEnds && (
									<p className="mt-1 text-sm">
										Access until:{" "}
										{new Date(
											subscription.gracePeriodEnds,
										).toLocaleDateString()}
									</p>
								)}
							</AlertDescription>
						</Alert>
					)}

					{hasBillingAccess && !isFree && (
						<div className="flex gap-2">
							<Button
								onClick={onOpenPortal}
								disabled={isLoadingPortal}
								variant="default"
							>
								{isLoadingPortal ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Opening...
									</>
								) : (
									<>
										<ExternalLink className="mr-2 h-4 w-4" />
										Manage Billing
									</>
								)}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</>
	);
}

function GeneralSettingsPageSkeleton() {
	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			<div className="space-y-2">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-96" />
			</div>
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Skeleton className="h-10 w-10 rounded-lg" />
						<div className="space-y-2">
							<Skeleton className="h-6 w-40" />
							<Skeleton className="h-4 w-64" />
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
					</div>
					<Skeleton className="h-16 w-full" />
				</CardContent>
			</Card>
		</div>
	);
}

function getStatusVariant(
	status: SubscriptionStatus,
): "default" | "secondary" | "destructive" | "outline" {
	switch (status) {
		case "ACTIVE":
			return "default";
		case "PENDING":
			return "secondary";
		case "ON_HOLD":
			return "outline";
		case "CANCELLED":
		case "EXPIRED":
			return "destructive";
		default:
			return "outline";
	}
}

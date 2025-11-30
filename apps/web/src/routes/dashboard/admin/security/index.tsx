import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowRight,
	FileWarning,
	Key,
	Loader2,
	Shield,
	ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useKeyStatus, useSecurityEvents } from "@/hooks/use-security";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/admin/security/")({
	component: SecurityAdminIndexPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function SecurityAdminIndexPage() {
	const { data: keyStatus, isLoading: keyStatusLoading } = useKeyStatus();
	const { data: recentEvents, isLoading: eventsLoading } = useSecurityEvents({
		limit: 5,
		severity: "HIGH",
	});

	const isLoading = keyStatusLoading || eventsLoading;

	if (isLoading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const rotationRecommended = keyStatus?.rotationRecommended ?? false;
	const daysSinceRotation = keyStatus?.lastRotation?.daysSinceRotation ?? 0;
	const highSeverityCount = recentEvents?.pagination.total ?? 0;

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div>
				<h1 className="font-bold text-2xl">Security Administration</h1>
				<p className="text-muted-foreground">
					Manage security settings, monitor events, and handle encryption keys
				</p>
			</div>

			{/* Alerts */}
			{(rotationRecommended || highSeverityCount > 0) && (
				<div className="space-y-3">
					{rotationRecommended && (
						<div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/50">
							<AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
							<div className="flex-1">
								<p className="font-medium text-amber-800 dark:text-amber-200">
									Key rotation recommended
								</p>
								<p className="text-amber-700 text-sm dark:text-amber-300">
									It has been {daysSinceRotation} days since the last key
									rotation.
								</p>
							</div>
							<Button variant="outline" size="sm" asChild>
								<Link to="/dashboard/admin/security/keys">
									Manage Keys
									<ArrowRight className="ml-1 h-4 w-4" />
								</Link>
							</Button>
						</div>
					)}

					{highSeverityCount > 0 && (
						<div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
							<ShieldAlert className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
							<div className="flex-1">
								<p className="font-medium text-red-800 dark:text-red-200">
									High severity events detected
								</p>
								<p className="text-red-700 text-sm dark:text-red-300">
									{highSeverityCount} high severity security event(s) require
									attention.
								</p>
							</div>
							<Button variant="outline" size="sm" asChild>
								<Link to="/dashboard/admin/security/events">
									View Events
									<ArrowRight className="ml-1 h-4 w-4" />
								</Link>
							</Button>
						</div>
					)}
				</div>
			)}

			{/* Quick Access Cards */}
			<div className="grid gap-4 md:grid-cols-2">
				{/* Security Events Card */}
				<Card className="transition-shadow hover:shadow-md">
					<CardHeader>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
									<FileWarning className="h-5 w-5 text-primary" />
								</div>
								<div>
									<CardTitle>Security Events</CardTitle>
									<CardDescription>
										Monitor security events and incidents
									</CardDescription>
								</div>
							</div>
							{highSeverityCount > 0 && (
								<Badge variant="destructive">{highSeverityCount} High</Badge>
							)}
						</div>
					</CardHeader>
					<CardContent>
						<p className="mb-4 text-muted-foreground text-sm">
							View authentication failures, permission denials, MFA events, and
							other security-related activities across your hospital.
						</p>
						<Button variant="outline" className="w-full" asChild>
							<Link to="/dashboard/admin/security/events">
								View Security Events
								<ArrowRight className="ml-2 h-4 w-4" />
							</Link>
						</Button>
					</CardContent>
				</Card>

				{/* Key Management Card */}
				<Card className="transition-shadow hover:shadow-md">
					<CardHeader>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
									<Key className="h-5 w-5 text-primary" />
								</div>
								<div>
									<CardTitle>Encryption Keys</CardTitle>
									<CardDescription>
										Manage data encryption and key rotation
									</CardDescription>
								</div>
							</div>
							{rotationRecommended ? (
								<Badge variant="secondary">Rotation Due</Badge>
							) : (
								<Badge variant="outline">Secure</Badge>
							)}
						</div>
					</CardHeader>
					<CardContent>
						<p className="mb-4 text-muted-foreground text-sm">
							Rotate encryption keys, view key status, and ensure compliance
							with healthcare data protection requirements.
						</p>
						<Button variant="outline" className="w-full" asChild>
							<Link to="/dashboard/admin/security/keys">
								Manage Encryption Keys
								<ArrowRight className="ml-2 h-4 w-4" />
							</Link>
						</Button>
					</CardContent>
				</Card>
			</div>

			{/* Security Overview */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Shield className="h-5 w-5 text-primary" />
						<CardTitle>Security Overview</CardTitle>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 sm:grid-cols-3">
						<div className="rounded-lg border p-4">
							<p className="text-muted-foreground text-sm">Current Key</p>
							<p className="mt-1 font-mono text-sm">
								{keyStatus?.currentKeyId || "N/A"}
							</p>
						</div>
						<div className="rounded-lg border p-4">
							<p className="text-muted-foreground text-sm">Last Rotation</p>
							<p className="mt-1 font-medium">
								{keyStatus?.lastRotation
									? `${daysSinceRotation} days ago`
									: "Never"}
							</p>
						</div>
						<div className="rounded-lg border p-4">
							<p className="text-muted-foreground text-sm">Total Rotations</p>
							<p className="mt-1 font-bold text-xl">
								{keyStatus?.totalRotations ?? 0}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

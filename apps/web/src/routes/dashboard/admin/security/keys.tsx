import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	Key,
	Loader2,
	RefreshCw,
	Shield,
	ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useKeyStatus, useRotateKeys } from "@/hooks/use-security";
import { authClient } from "@/lib/auth-client";
import type { ApiError } from "@/lib/security-client";

export const Route = createFileRoute("/dashboard/admin/security/keys")({
	component: KeyManagementPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function KeyManagementPage() {
	const { data: keyStatus, isLoading, error } = useKeyStatus();
	const rotateKeysMutation = useRotateKeys();
	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

	const handleRotateKeys = async () => {
		try {
			const result = await rotateKeysMutation.mutateAsync();
			toast.success(
				`Encryption keys rotated successfully. ${result.recordsReEncrypted} records re-encrypted.`,
			);
			setConfirmDialogOpen(false);
		} catch (error) {
			const apiError = error as ApiError;
			toast.error(apiError.message || "Failed to rotate encryption keys");
		}
	};

	if (isLoading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex h-64 flex-col items-center justify-center gap-2">
				<AlertTriangle className="h-8 w-8 text-destructive" />
				<p className="text-muted-foreground">Failed to load key status</p>
			</div>
		);
	}

	const daysSinceRotation = keyStatus?.lastRotation?.daysSinceRotation ?? 0;
	const rotationRecommended = keyStatus?.rotationRecommended ?? false;

	return (
		<>
			<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
				{/* Header */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="font-bold text-2xl">Encryption Key Management</h1>
						<p className="text-muted-foreground">
							Manage and rotate encryption keys for sensitive data protection
						</p>
					</div>
					<Button
						onClick={() => setConfirmDialogOpen(true)}
						disabled={rotateKeysMutation.isPending}
					>
						{rotateKeysMutation.isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Rotating...
							</>
						) : (
							<>
								<RefreshCw className="mr-2 h-4 w-4" />
								Rotate Keys
							</>
						)}
					</Button>
				</div>

				{/* Rotation Warning */}
				{rotationRecommended && (
					<div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/50">
						<AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
						<div>
							<p className="font-medium text-amber-800 dark:text-amber-200">
								Key rotation recommended
							</p>
							<p className="text-amber-700 text-sm dark:text-amber-300">
								It has been {daysSinceRotation} days since the last key
								rotation. Regular key rotation is recommended for security
								compliance.
							</p>
						</div>
					</div>
				)}

				{/* Key Status Cards */}
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{/* Current Key Card */}
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="font-medium text-sm">Current Key</CardTitle>
							<Key className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-2">
								<code className="rounded bg-muted px-2 py-1 font-mono text-sm">
									{keyStatus?.currentKeyId || "N/A"}
								</code>
								<Badge variant="default" className="flex items-center gap-1">
									<ShieldCheck className="h-3 w-3" />
									Active
								</Badge>
							</div>
						</CardContent>
					</Card>

					{/* Last Rotation Card */}
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="font-medium text-sm">
								Last Rotation
							</CardTitle>
							<Calendar className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							{keyStatus?.lastRotation ? (
								<div className="space-y-1">
									<p className="font-medium">
										{new Date(
											keyStatus.lastRotation.rotatedAt,
										).toLocaleDateString()}
									</p>
									<p className="text-muted-foreground text-sm">
										{daysSinceRotation} days ago
									</p>
								</div>
							) : (
								<p className="text-muted-foreground">Never rotated</p>
							)}
						</CardContent>
					</Card>

					{/* Total Rotations Card */}
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="font-medium text-sm">
								Total Rotations
							</CardTitle>
							<RefreshCw className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<p className="font-bold text-2xl">
								{keyStatus?.totalRotations ?? 0}
							</p>
							<p className="text-muted-foreground text-sm">
								All-time rotations
							</p>
						</CardContent>
					</Card>
				</div>

				{/* Last Rotation Details */}
				{keyStatus?.lastRotation && (
					<Card>
						<CardHeader>
							<div className="flex items-center gap-2">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
									<Shield className="h-5 w-5 text-primary" />
								</div>
								<div>
									<CardTitle>Last Rotation Details</CardTitle>
									<CardDescription>
										Information about the most recent key rotation
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-3">
									<div>
										<p className="text-muted-foreground text-sm">
											Rotation Date
										</p>
										<p className="font-medium">
											{new Date(
												keyStatus.lastRotation.rotatedAt,
											).toLocaleString()}
										</p>
									</div>
									<div>
										<p className="text-muted-foreground text-sm">Rotated By</p>
										<p className="font-mono text-sm">
											{keyStatus.lastRotation.rotatedBy}
										</p>
									</div>
								</div>
								<div className="space-y-3">
									<div>
										<p className="text-muted-foreground text-sm">
											Records Re-encrypted
										</p>
										<p className="font-medium">
											{keyStatus.lastRotation.recordsReEncrypted.toLocaleString()}
										</p>
									</div>
									<div>
										<p className="text-muted-foreground text-sm">
											Days Since Rotation
										</p>
										<p className="font-medium">{daysSinceRotation} days</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Security Best Practices */}
				<Card>
					<CardHeader>
						<CardTitle>Security Best Practices</CardTitle>
						<CardDescription>
							Recommendations for encryption key management
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="space-y-3">
							<li className="flex items-start gap-3">
								<CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
								<div>
									<p className="font-medium">Regular Rotation</p>
									<p className="text-muted-foreground text-sm">
										Rotate encryption keys at least every 90 days to minimize
										the risk of key compromise.
									</p>
								</div>
							</li>
							<li className="flex items-start gap-3">
								<CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
								<div>
									<p className="font-medium">Audit Logging</p>
									<p className="text-muted-foreground text-sm">
										All key rotation events are logged and can be reviewed in
										the Security Events section.
									</p>
								</div>
							</li>
							<li className="flex items-start gap-3">
								<CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
								<div>
									<p className="font-medium">Automatic Re-encryption</p>
									<p className="text-muted-foreground text-sm">
										When keys are rotated, all encrypted data is automatically
										re-encrypted with the new key.
									</p>
								</div>
							</li>
							<li className="flex items-start gap-3">
								<CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
								<div>
									<p className="font-medium">HIPAA Compliance</p>
									<p className="text-muted-foreground text-sm">
										Key rotation helps maintain compliance with HIPAA and other
										healthcare data protection regulations.
									</p>
								</div>
							</li>
						</ul>
					</CardContent>
				</Card>
			</div>

			{/* Confirm Rotation Dialog */}
			<AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<RefreshCw className="h-5 w-5" />
							Rotate Encryption Keys
						</AlertDialogTitle>
						<AlertDialogDescription>
							This action will generate new encryption keys and re-encrypt all
							sensitive data. This process may take a few minutes depending on
							the amount of data.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<Separator className="my-2" />
					<div className="space-y-2 py-2">
						<p className="font-medium text-sm">What happens during rotation:</p>
						<ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
							<li>A new encryption key is generated</li>
							<li>All encrypted records are re-encrypted with the new key</li>
							<li>The old key is securely retired</li>
							<li>A security event is logged for audit purposes</li>
						</ul>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleRotateKeys}
							disabled={rotateKeysMutation.isPending}
						>
							{rotateKeysMutation.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Rotating...
								</>
							) : (
								<>
									<RefreshCw className="mr-2 h-4 w-4" />
									Rotate Keys
								</>
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

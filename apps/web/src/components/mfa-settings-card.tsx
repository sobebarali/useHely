import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useDisableMfa, useSession } from "@/hooks/use-auth";
import type { AuthError } from "@/lib/auth-client";
import MfaSetupDialog from "./mfa-setup-dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./ui/card";

export default function MfaSettingsCard() {
	const { data: session, refetch } = useSession();
	const [setupDialogOpen, setSetupDialogOpen] = useState(false);
	const disableMfa = useDisableMfa();

	// Get MFA status from session
	const isMfaEnabled = session?.mfaEnabled ?? false;

	const handleDisableMfa = async () => {
		try {
			await disableMfa.mutateAsync();
			toast.success("Two-factor authentication disabled");
			refetch();
		} catch (error) {
			const authError = error as AuthError;
			toast.error(authError.message || "Failed to disable MFA");
		}
	};

	const handleSetupSuccess = () => {
		refetch();
	};

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<ShieldCheck className="h-5 w-5" />
						Two-Factor Authentication
					</CardTitle>
					<CardDescription>
						Add an extra layer of security to your account by requiring a
						verification code in addition to your password.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isMfaEnabled ? (
						<div className="space-y-4">
							<div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 p-4">
								<ShieldCheck className="h-5 w-5 text-green-500" />
								<div>
									<p className="font-medium text-green-600 dark:text-green-400">
										Two-factor authentication is enabled
									</p>
									<p className="text-muted-foreground text-sm">
										Your account is protected with an authenticator app
									</p>
								</div>
							</div>

							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="destructive" className="w-full sm:w-auto">
										<ShieldOff className="mr-2 h-4 w-4" />
										Disable Two-Factor Authentication
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>
											Disable Two-Factor Authentication?
										</AlertDialogTitle>
										<AlertDialogDescription>
											This will remove the extra security layer from your
											account. You will only need your password to sign in.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											onClick={handleDisableMfa}
											className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
											disabled={disableMfa.isPending}
										>
											{disableMfa.isPending ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Disabling...
												</>
											) : (
												"Disable"
											)}
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					) : (
						<div className="space-y-4">
							<div className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
								<ShieldOff className="h-5 w-5 text-amber-500" />
								<div>
									<p className="font-medium text-amber-600 dark:text-amber-400">
										Two-factor authentication is not enabled
									</p>
									<p className="text-muted-foreground text-sm">
										Enable it to add an extra layer of security to your account
									</p>
								</div>
							</div>

							<Button
								onClick={() => setSetupDialogOpen(true)}
								className="w-full sm:w-auto"
							>
								<ShieldCheck className="mr-2 h-4 w-4" />
								Enable Two-Factor Authentication
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			<MfaSetupDialog
				open={setupDialogOpen}
				onOpenChange={setSetupDialogOpen}
				onSuccess={handleSetupSuccess}
			/>
		</>
	);
}

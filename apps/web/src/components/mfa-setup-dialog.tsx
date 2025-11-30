import { useForm } from "@tanstack/react-form";
import { Check, Copy, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { useEnableMfa, useVerifyMfa } from "@/hooks/use-auth";
import type { AuthError, MfaSetupResponse } from "@/lib/auth-client";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface MfaSetupDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

type SetupStep = "loading" | "scan" | "verify" | "backup" | "complete";

export default function MfaSetupDialog({
	open,
	onOpenChange,
	onSuccess,
}: MfaSetupDialogProps) {
	const [step, setStep] = useState<SetupStep>("loading");
	const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
	const [copiedSecret, setCopiedSecret] = useState(false);
	const [copiedBackup, setCopiedBackup] = useState(false);

	const enableMfa = useEnableMfa();
	const verifyMfa = useVerifyMfa();

	// Start MFA setup when dialog opens
	const handleOpenChange = async (isOpen: boolean) => {
		if (isOpen && !setupData) {
			setStep("loading");
			try {
				const data = await enableMfa.mutateAsync();
				setSetupData(data);
				setStep("scan");
			} catch (error) {
				const authError = error as AuthError;
				toast.error(authError.message || "Failed to enable MFA");
				onOpenChange(false);
			}
		} else if (!isOpen) {
			// Reset state when closing
			setSetupData(null);
			setStep("loading");
			setCopiedSecret(false);
			setCopiedBackup(false);
		}
		onOpenChange(isOpen);
	};

	const copyToClipboard = async (text: string, type: "secret" | "backup") => {
		try {
			await navigator.clipboard.writeText(text);
			if (type === "secret") {
				setCopiedSecret(true);
				setTimeout(() => setCopiedSecret(false), 2000);
			} else {
				setCopiedBackup(true);
				setTimeout(() => setCopiedBackup(false), 2000);
			}
			toast.success("Copied to clipboard");
		} catch {
			toast.error("Failed to copy");
		}
	};

	const form = useForm({
		defaultValues: {
			code: "",
		},
		onSubmit: async ({ value }) => {
			try {
				await verifyMfa.mutateAsync({ code: value.code });
				setStep("backup");
			} catch (error) {
				const authError = error as AuthError;
				toast.error(authError.message || "Invalid verification code");
			}
		},
		validators: {
			onSubmit: z.object({
				code: z
					.string()
					.length(6, "Code must be exactly 6 digits")
					.regex(/^\d{6}$/, "Code must contain only digits"),
			}),
		},
	});

	const handleComplete = () => {
		setStep("complete");
		toast.success("Two-factor authentication enabled");
		onSuccess();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ShieldCheck className="h-5 w-5 text-primary" />
						Set Up Two-Factor Authentication
					</DialogTitle>
					<DialogDescription>
						{step === "loading" && "Setting up two-factor authentication..."}
						{step === "scan" && "Scan the QR code with your authenticator app"}
						{step === "verify" && "Enter the code from your authenticator app"}
						{step === "backup" && "Save your backup codes"}
					</DialogDescription>
				</DialogHeader>

				{step === "loading" && (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				)}

				{step === "scan" && setupData && (
					<div className="space-y-4">
						<div className="flex justify-center">
							<div className="rounded-lg border bg-white p-4">
								<img
									src={setupData.qrCodeDataUrl}
									alt="MFA QR Code"
									className="h-48 w-48"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-muted-foreground text-sm">
								Can't scan? Enter this code manually:
							</Label>
							<div className="flex items-center gap-2">
								<code className="flex-1 break-all rounded bg-muted px-3 py-2 font-mono text-sm">
									{setupData.secret}
								</code>
								<Button
									variant="outline"
									size="icon"
									onClick={() => copyToClipboard(setupData.secret, "secret")}
								>
									{copiedSecret ? (
										<Check className="h-4 w-4 text-green-500" />
									) : (
										<Copy className="h-4 w-4" />
									)}
								</Button>
							</div>
						</div>

						<Button className="w-full" onClick={() => setStep("verify")}>
							Continue
						</Button>
					</div>
				)}

				{step === "verify" && (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-4"
					>
						<form.Field name="code">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Verification Code</Label>
									<Input
										id={field.name}
										name={field.name}
										type="text"
										inputMode="numeric"
										autoComplete="one-time-code"
										maxLength={6}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => {
											const value = e.target.value.replace(/\D/g, "");
											field.handleChange(value);
										}}
										placeholder="000000"
										className="text-center font-mono text-2xl tracking-[0.5em]"
										autoFocus
									/>
									{field.state.meta.errors.map((error) => (
										<p key={error?.message} className="text-red-500 text-sm">
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>

						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								className="flex-1"
								onClick={() => setStep("scan")}
							>
								Back
							</Button>
							<form.Subscribe>
								{(state) => (
									<Button
										type="submit"
										className="flex-1"
										disabled={
											!state.canSubmit ||
											state.isSubmitting ||
											verifyMfa.isPending
										}
									>
										{state.isSubmitting || verifyMfa.isPending ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Verifying...
											</>
										) : (
											"Verify"
										)}
									</Button>
								)}
							</form.Subscribe>
						</div>
					</form>
				)}

				{step === "backup" && setupData && (
					<div className="space-y-4">
						<div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
							<p className="text-amber-600 text-sm dark:text-amber-400">
								Save these backup codes in a safe place. Each code can only be
								used once to sign in if you lose access to your authenticator
								app.
							</p>
						</div>

						<div className="grid grid-cols-2 gap-2">
							{setupData.backupCodes.map((code) => (
								<code
									key={code}
									className="rounded bg-muted px-3 py-2 text-center font-mono text-sm"
								>
									{code}
								</code>
							))}
						</div>

						<Button
							variant="outline"
							className="w-full"
							onClick={() =>
								copyToClipboard(setupData.backupCodes.join("\n"), "backup")
							}
						>
							{copiedBackup ? (
								<>
									<Check className="mr-2 h-4 w-4 text-green-500" />
									Copied!
								</>
							) : (
								<>
									<Copy className="mr-2 h-4 w-4" />
									Copy All Codes
								</>
							)}
						</Button>

						<Button className="w-full" onClick={handleComplete}>
							I've Saved My Codes
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

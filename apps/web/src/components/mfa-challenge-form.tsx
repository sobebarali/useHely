import { useForm } from "@tanstack/react-form";
import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { useSubmitMfaCode } from "@/hooks/use-auth";
import type { AuthError } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface MfaChallengeFormProps {
	challengeToken: string;
	expiresIn: number;
	onSuccess: () => void;
	onCancel: () => void;
}

export default function MfaChallengeForm({
	challengeToken,
	expiresIn,
	onSuccess,
	onCancel,
}: MfaChallengeFormProps) {
	const [timeLeft, setTimeLeft] = useState(expiresIn);
	const submitMfaCode = useSubmitMfaCode();

	// Countdown timer
	useEffect(() => {
		if (timeLeft <= 0) {
			toast.error("MFA challenge expired. Please sign in again.");
			onCancel();
			return;
		}

		const timer = setInterval(() => {
			setTimeLeft((prev) => prev - 1);
		}, 1000);

		return () => clearInterval(timer);
	}, [timeLeft, onCancel]);

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const form = useForm({
		defaultValues: {
			code: "",
		},
		onSubmit: async ({ value }) => {
			try {
				await submitMfaCode.mutateAsync({
					challengeToken,
					code: value.code,
				});
				toast.success("Authentication successful");
				onSuccess();
			} catch (error) {
				const authError = error as AuthError;
				toast.error(authError.message || "Invalid authentication code");
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

	return (
		<div className="w-full">
			<div className="mb-8 text-center lg:text-left">
				<div className="mb-4 flex items-center justify-center gap-2 lg:justify-start">
					<ShieldCheck className="h-8 w-8 text-primary" />
					<h1 className="font-bold text-2xl">Two-Factor Authentication</h1>
				</div>
				<p className="mt-2 text-muted-foreground">
					Enter the 6-digit code from your authenticator app
				</p>
			</div>

			<Card className="border-border/50 bg-card/50 backdrop-blur-sm">
				<CardContent className="pt-6">
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
									<Label htmlFor={field.name}>Authentication Code</Label>
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
											// Only allow digits
											const value = e.target.value.replace(/\D/g, "");
											field.handleChange(value);
										}}
										placeholder="000000"
										className="bg-background/50 text-center font-mono text-2xl tracking-[0.5em]"
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

						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">
								Time remaining: {formatTime(timeLeft)}
							</span>
							{timeLeft < 60 && (
								<span className="text-amber-500">Expiring soon!</span>
							)}
						</div>

						<form.Subscribe>
							{(state) => (
								<Button
									type="submit"
									className="w-full"
									size="lg"
									disabled={
										!state.canSubmit ||
										state.isSubmitting ||
										submitMfaCode.isPending
									}
								>
									{state.isSubmitting || submitMfaCode.isPending ? (
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
					</form>

					<div className="mt-6 space-y-4">
						<div className="text-center">
							<p className="text-muted-foreground text-sm">
								Don't have access to your authenticator app?
							</p>
							<p className="text-muted-foreground text-sm">
								You can use a backup code instead.
							</p>
						</div>

						<Button
							variant="ghost"
							onClick={onCancel}
							className="w-full text-muted-foreground"
						>
							Back to sign in
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

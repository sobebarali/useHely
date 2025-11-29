import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import {
	ArrowLeft,
	Building2,
	CheckCircle,
	KeyRound,
	Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPassword } from "@/hooks/use-users";
import type { ApiError } from "@/lib/users-client";

const searchSchema = z.object({
	token: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
	component: ResetPasswordPage,
	validateSearch: searchSchema,
});

function ResetPasswordPage() {
	const { token } = useSearch({ from: "/reset-password" });
	const [isSubmitted, setIsSubmitted] = useState(false);
	const resetPasswordMutation = useResetPassword();

	const form = useForm({
		defaultValues: {
			newPassword: "",
			confirmPassword: "",
		},
		onSubmit: async ({ value }) => {
			if (!token) {
				toast.error("Invalid reset token");
				return;
			}

			try {
				await resetPasswordMutation.mutateAsync({
					token,
					newPassword: value.newPassword,
					confirmPassword: value.confirmPassword,
				});
				setIsSubmitted(true);
				toast.success("Password reset successful");
			} catch (error) {
				const apiError = error as ApiError;
				toast.error(apiError.message || "Failed to reset password");
			}
		},
		validators: {
			onSubmit: z
				.object({
					newPassword: z
						.string()
						.min(8, "Password must be at least 8 characters")
						.regex(
							/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
							"Password must contain uppercase, lowercase, number, and special character",
						),
					confirmPassword: z.string().min(1, "Please confirm your password"),
				})
				.refine((data) => data.newPassword === data.confirmPassword, {
					message: "Passwords do not match",
					path: ["confirmPassword"],
				}),
		},
	});

	if (!token) {
		return (
			<div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/50">
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					<div className="absolute top-1/4 right-0 h-96 w-96 translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
					<div className="-translate-x-1/2 absolute bottom-0 left-0 h-96 w-96 translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
				</div>

				<div className="relative flex min-h-screen items-center justify-center px-4">
					<div className="w-full max-w-md">
						<Card className="border-border/50 bg-card/50 backdrop-blur-sm">
							<CardContent className="pt-6">
								<div className="flex flex-col items-center text-center">
									<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
										<KeyRound className="h-8 w-8 text-red-500" />
									</div>
									<h2 className="mb-2 font-bold text-xl">Invalid reset link</h2>
									<p className="mb-6 text-muted-foreground">
										This password reset link is invalid or has expired. Please
										request a new one.
									</p>
									<Button asChild className="w-full">
										<Link to="/forgot-password">Request new link</Link>
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		);
	}

	if (isSubmitted) {
		return (
			<div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/50">
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					<div className="absolute top-1/4 right-0 h-96 w-96 translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
					<div className="-translate-x-1/2 absolute bottom-0 left-0 h-96 w-96 translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
				</div>

				<div className="relative flex min-h-screen items-center justify-center px-4">
					<div className="w-full max-w-md">
						<div className="mb-8 text-center">
							<Link to="/" className="mb-8 inline-flex items-center gap-2">
								<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
									<Building2 className="h-5 w-5 text-primary" />
								</div>
								<span className="font-bold text-lg">useHely</span>
							</Link>
						</div>

						<Card className="border-border/50 bg-card/50 backdrop-blur-sm">
							<CardContent className="pt-6">
								<div className="flex flex-col items-center text-center">
									<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
										<CheckCircle className="h-8 w-8 text-green-500" />
									</div>
									<h2 className="mb-2 font-bold text-xl">
										Password reset successful
									</h2>
									<p className="mb-6 text-muted-foreground">
										Your password has been reset successfully. You can now sign
										in with your new password.
									</p>
									<Button asChild className="w-full">
										<Link to="/login">Sign in</Link>
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/50">
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute top-1/4 right-0 h-96 w-96 translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
				<div className="-translate-x-1/2 absolute bottom-0 left-0 h-96 w-96 translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
			</div>

			<div className="relative flex min-h-screen items-center justify-center px-4">
				<div className="w-full max-w-md">
					<div className="mb-8 text-center">
						<Link to="/" className="mb-8 inline-flex items-center gap-2">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
								<Building2 className="h-5 w-5 text-primary" />
							</div>
							<span className="font-bold text-lg">useHely</span>
						</Link>
					</div>

					<div className="mb-8 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
							<KeyRound className="h-8 w-8 text-primary" />
						</div>
						<h1 className="font-bold text-2xl">Set new password</h1>
						<p className="mt-2 text-muted-foreground">
							Your new password must be different from previously used passwords
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
								<form.Field name="newPassword">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>New Password</Label>
											<Input
												id={field.name}
												name={field.name}
												type="password"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="Enter new password"
												className="bg-background/50"
											/>
											{field.state.meta.errors.map((error) => (
												<p
													key={error?.message}
													className="text-red-500 text-sm"
												>
													{error?.message}
												</p>
											))}
										</div>
									)}
								</form.Field>

								<form.Field name="confirmPassword">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Confirm Password</Label>
											<Input
												id={field.name}
												name={field.name}
												type="password"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="Confirm new password"
												className="bg-background/50"
											/>
											{field.state.meta.errors.map((error) => (
												<p
													key={error?.message}
													className="text-red-500 text-sm"
												>
													{error?.message}
												</p>
											))}
										</div>
									)}
								</form.Field>

								<div className="rounded-lg border border-muted bg-muted/50 p-3">
									<p className="mb-2 font-medium text-sm">
										Password requirements:
									</p>
									<ul className="space-y-1 text-muted-foreground text-xs">
										<li>At least 8 characters</li>
										<li>At least one uppercase letter</li>
										<li>At least one lowercase letter</li>
										<li>At least one number</li>
										<li>At least one special character (@$!%*?&)</li>
									</ul>
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
												resetPasswordMutation.isPending
											}
										>
											{state.isSubmitting || resetPasswordMutation.isPending ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Resetting...
												</>
											) : (
												"Reset password"
											)}
										</Button>
									)}
								</form.Subscribe>
							</form>

							<div className="mt-6 text-center">
								<Link
									to="/login"
									className="inline-flex items-center text-primary text-sm hover:underline"
								>
									<ArrowLeft className="mr-1 h-4 w-4" />
									Back to login
								</Link>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { UseHelyLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useHospitalsForEmail } from "@/hooks/use-auth";
import { useForgotPassword } from "@/hooks/use-users";
import type { ApiError } from "@/lib/users-client";

export const Route = createFileRoute("/forgot-password")({
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [selectedHospital, setSelectedHospital] = useState("");
	const [isSubmitted, setIsSubmitted] = useState(false);

	const { data: hospitals, isLoading: hospitalsLoading } =
		useHospitalsForEmail(email);
	const forgotPasswordMutation = useForgotPassword();

	// Auto-select hospital if only one available
	useEffect(() => {
		if (hospitals?.length === 1 && !selectedHospital) {
			setSelectedHospital(hospitals[0].id);
		}
	}, [hospitals, selectedHospital]);

	// Reset hospital selection when email changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: email is the trigger for reset
	useEffect(() => {
		setSelectedHospital("");
	}, [email]);

	const form = useForm({
		defaultValues: {
			email: "",
		},
		onSubmit: async ({ value }) => {
			if (!selectedHospital) {
				toast.error("Please select a hospital");
				return;
			}

			try {
				await forgotPasswordMutation.mutateAsync({
					email: value.email,
					tenantId: selectedHospital,
				});
				setIsSubmitted(true);
				toast.success("Password reset email sent");
			} catch (error) {
				const apiError = error as ApiError;
				toast.error(apiError.message || "Failed to send reset email");
			}
		},
		validators: {
			onSubmit: z.object({
				email: z.string().email("Invalid email address"),
			}),
		},
	});

	const showHospitalSelector =
		email.includes("@") && hospitals && hospitals.length > 0;
	const noHospitalsFound =
		email.includes("@") && !hospitalsLoading && hospitals?.length === 0;

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
									<UseHelyLogo className="h-5 w-5 text-primary" />
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
									<h2 className="mb-2 font-bold text-xl">Check your email</h2>
									<p className="mb-6 text-muted-foreground">
										We've sent a password reset link to{" "}
										<span className="font-medium text-foreground">
											{form.state.values.email}
										</span>
									</p>
									<div className="flex w-full flex-col gap-3">
										<Button variant="outline" asChild>
											<Link to="/login">
												<ArrowLeft className="mr-2 h-4 w-4" />
												Back to login
											</Link>
										</Button>
									</div>
									<p className="mt-4 text-muted-foreground text-sm">
										Didn't receive the email?{" "}
										<button
											type="button"
											onClick={() => setIsSubmitted(false)}
											className="text-primary hover:underline"
										>
											Try again
										</button>
									</p>
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
								<UseHelyLogo className="h-5 w-5 text-primary" />
							</div>
							<span className="font-bold text-lg">useHely</span>
						</Link>
					</div>

					<div className="mb-8 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
							<Mail className="h-8 w-8 text-primary" />
						</div>
						<h1 className="font-bold text-2xl">Forgot your password?</h1>
						<p className="mt-2 text-muted-foreground">
							No worries, we'll send you reset instructions
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
								<form.Field name="email">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Email</Label>
											<Input
												id={field.name}
												name={field.name}
												type="email"
												value={field.state.value}
												onBlur={(e) => {
													field.handleBlur();
													setEmail(e.target.value);
												}}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="you@example.com"
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

								{showHospitalSelector && (
									<div className="space-y-2">
										<Label htmlFor="hospital">Hospital</Label>
										<Select
											value={selectedHospital}
											onValueChange={setSelectedHospital}
										>
											<SelectTrigger className="bg-background/50">
												<SelectValue placeholder="Select a hospital" />
											</SelectTrigger>
											<SelectContent>
												{hospitals.map((hospital) => (
													<SelectItem key={hospital.id} value={hospital.id}>
														{hospital.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}

								{hospitalsLoading && email.includes("@") && (
									<div className="flex items-center gap-2 text-muted-foreground text-sm">
										<Loader2 className="h-4 w-4 animate-spin" />
										<span>Finding your hospitals...</span>
									</div>
								)}

								{noHospitalsFound && (
									<div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
										<p className="text-red-400 text-sm">
											No hospitals found for this email. Please check your email
											or contact your administrator.
										</p>
									</div>
								)}

								<form.Subscribe>
									{(state) => (
										<Button
											type="submit"
											className="w-full"
											size="lg"
											disabled={
												!state.canSubmit ||
												state.isSubmitting ||
												forgotPasswordMutation.isPending ||
												!selectedHospital
											}
										>
											{state.isSubmitting ||
											forgotPasswordMutation.isPending ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Sending...
												</>
											) : (
												"Send reset link"
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

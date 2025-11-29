import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { useHospitalsForEmail, useSignIn } from "@/hooks/use-auth";
import type { AuthError } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

export default function SignInForm({
	onSwitchToSignUp,
}: {
	onSwitchToSignUp: () => void;
}) {
	const navigate = useNavigate({
		from: "/",
	});

	const [email, setEmail] = useState("");
	const [selectedHospital, setSelectedHospital] = useState("");

	const { data: hospitals, isLoading: hospitalsLoading } =
		useHospitalsForEmail(email);
	const signInMutation = useSignIn();

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
			password: "",
		},
		onSubmit: async ({ value }) => {
			if (!selectedHospital) {
				toast.error("Please select a hospital");
				return;
			}

			try {
				await signInMutation.mutateAsync({
					email: value.email,
					password: value.password,
					tenantId: selectedHospital,
				});
				toast.success("Sign in successful");
				navigate({
					to: "/dashboard",
				});
			} catch (error) {
				const authError = error as AuthError;
				toast.error(authError.message || "Sign in failed");
			}
		},
		validators: {
			onSubmit: z.object({
				email: z.string().email("Invalid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
			}),
		},
	});

	const showHospitalSelector =
		email.includes("@") && hospitals && hospitals.length > 0;
	const noHospitalsFound =
		email.includes("@") && !hospitalsLoading && hospitals?.length === 0;

	return (
		<div className="w-full">
			<div className="mb-8 text-center lg:text-left">
				<h1 className="font-bold text-2xl">Sign in to your account</h1>
				<p className="mt-2 text-muted-foreground">
					Enter your credentials to access your dashboard
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
										<p key={error?.message} className="text-red-500 text-sm">
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
								{hospitals.length > 1 && (
									<p className="text-muted-foreground text-xs">
										You have access to multiple hospitals. Select which one to
										sign into.
									</p>
								)}
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
									No hospitals found for this email. Please check your email or
									contact your administrator.
								</p>
							</div>
						)}

						<form.Field name="password">
							{(field) => (
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<Label htmlFor={field.name}>Password</Label>
										<Link
											to="/forgot-password"
											className="text-primary text-sm hover:underline"
										>
											Forgot password?
										</Link>
									</div>
									<Input
										id={field.name}
										name={field.name}
										type="password"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="Enter your password"
										className="bg-background/50"
									/>
									{field.state.meta.errors.map((error) => (
										<p key={error?.message} className="text-red-500 text-sm">
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>

						<form.Subscribe>
							{(state) => (
								<Button
									type="submit"
									className="w-full"
									size="lg"
									disabled={
										!state.canSubmit ||
										state.isSubmitting ||
										signInMutation.isPending ||
										!selectedHospital
									}
								>
									{state.isSubmitting || signInMutation.isPending ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Signing in...
										</>
									) : (
										"Sign In"
									)}
								</Button>
							)}
						</form.Subscribe>
					</form>

					<div className="mt-6 text-center">
						<Button
							variant="link"
							onClick={onSwitchToSignUp}
							className="text-primary"
						>
							Need an account? Sign Up
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

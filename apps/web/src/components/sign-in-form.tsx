import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { useHospitalsForEmail, useSignIn } from "@/hooks/use-auth";
import type { AuthError } from "@/lib/auth-client";
import { Button } from "./ui/button";
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
		<div className="mx-auto mt-10 w-full max-w-md p-6">
			<h1 className="mb-6 text-center font-bold text-3xl">Welcome Back</h1>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-4"
			>
				<div>
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
								/>
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="text-red-500 text-sm">
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>
				</div>

				{showHospitalSelector && (
					<div className="space-y-2">
						<Label htmlFor="hospital">Hospital</Label>
						<Select
							value={selectedHospital}
							onValueChange={setSelectedHospital}
						>
							<SelectTrigger>
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
								You have access to multiple hospitals. Select which one to sign
								into.
							</p>
						)}
					</div>
				)}

				{hospitalsLoading && email.includes("@") && (
					<p className="text-muted-foreground text-sm">Loading hospitals...</p>
				)}

				{noHospitalsFound && (
					<p className="text-red-500 text-sm">
						No hospitals found for this email. Please check your email or
						contact your administrator.
					</p>
				)}

				<div>
					<form.Field name="password">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Password</Label>
								<Input
									id={field.name}
									name={field.name}
									type="password"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Enter your password"
								/>
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="text-red-500 text-sm">
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>
				</div>

				<form.Subscribe>
					{(state) => (
						<Button
							type="submit"
							className="w-full"
							disabled={
								!state.canSubmit ||
								state.isSubmitting ||
								signInMutation.isPending ||
								!selectedHospital
							}
						>
							{state.isSubmitting || signInMutation.isPending
								? "Signing in..."
								: "Sign In"}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<div className="mt-4 text-center">
				<Button
					variant="link"
					onClick={onSwitchToSignUp}
					className="text-indigo-600 hover:text-indigo-800"
				>
					Need an account? Sign Up
				</Button>
			</div>
		</div>
	);
}

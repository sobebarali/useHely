import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Activity,
	Calendar,
	FileText,
	Lock,
	ShieldCheck,
	Users,
} from "lucide-react";
import { useState } from "react";
import { UseHelyLogo } from "@/components/icons";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

function LoginPage() {
	const [showSignIn, setShowSignIn] = useState(true);

	return (
		<div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/50">
			{/* Background decorations */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute top-1/4 right-0 h-96 w-96 translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
				<div className="-translate-x-1/2 absolute bottom-0 left-0 h-96 w-96 translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
			</div>

			<div className="relative grid min-h-screen lg:grid-cols-2">
				{/* Left Column - Image & Features (Hidden on mobile) */}
				<div className="relative hidden lg:block">
					{/* Full height image */}
					<div className="absolute inset-0">
						<img
							src="https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1200&h=1600&fit=crop&q=80"
							alt="Medical team collaborating in a modern hospital"
							className="h-full w-full object-cover"
						/>
						{/* Dark overlay */}
						<div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
						<div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
					</div>

					{/* Content overlay */}
					<div className="relative flex h-full flex-col justify-center p-12">
						<Link to="/" className="mb-8 flex items-center gap-3">
							<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 backdrop-blur-sm">
								<UseHelyLogo className="h-6 w-6 text-primary" />
							</div>
							<span className="font-bold text-xl">useHely</span>
						</Link>

						<h1 className="mb-4 font-bold text-4xl leading-tight">
							Welcome back to your hospital dashboard
						</h1>
						<p className="mb-8 max-w-md text-lg text-muted-foreground">
							Sign in to manage patients, appointments, prescriptions, and more
							- all from one powerful platform.
						</p>

						{/* Feature highlights */}
						<div className="grid grid-cols-2 gap-4">
							{[
								{ icon: Users, label: "Patient Management" },
								{ icon: Calendar, label: "Appointments" },
								{ icon: FileText, label: "Prescriptions" },
								{ icon: Activity, label: "Real-time Vitals" },
							].map((feature) => (
								<div
									key={feature.label}
									className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/30 p-3 backdrop-blur-sm"
								>
									<feature.icon className="h-5 w-5 text-primary" />
									<span className="text-sm">{feature.label}</span>
								</div>
							))}
						</div>

						{/* Security badges */}
						<div className="mt-8 flex items-center gap-6">
							<div className="flex items-center gap-2 text-muted-foreground text-sm">
								<ShieldCheck className="h-4 w-4 text-green-500" />
								<span>HIPAA Compliant</span>
							</div>
							<div className="flex items-center gap-2 text-muted-foreground text-sm">
								<Lock className="h-4 w-4 text-green-500" />
								<span>256-bit Encryption</span>
							</div>
						</div>
					</div>
				</div>

				{/* Right Column - Login Form */}
				<div className="flex flex-col justify-center px-4 py-8 lg:px-12">
					{/* Mobile logo */}
					<div className="mb-8 lg:hidden">
						<Link to="/" className="flex items-center gap-2">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
								<UseHelyLogo className="h-5 w-5 text-primary" />
							</div>
							<span className="font-bold text-lg">useHely</span>
						</Link>
					</div>

					{/* Form container */}
					<div className="mx-auto w-full max-w-md">
						{showSignIn ? (
							<SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
						) : (
							<SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

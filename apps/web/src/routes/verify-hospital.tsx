import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	CheckCircle2,
	Loader2,
	Mail,
	ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { UseHelyLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useVerifyHospital } from "@/hooks/use-hospital";
import type { AuthError } from "@/lib/auth-client";

export const Route = createFileRoute("/verify-hospital")({
	component: VerifyHospitalPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			token: (search.token as string) || "",
			hospitalId: (search.hospitalId as string) || "",
		};
	},
});

function VerifyHospitalPage() {
	const { token, hospitalId } = Route.useSearch();
	const verifyMutation = useVerifyHospital();
	const [verificationAttempted, setVerificationAttempted] = useState(false);

	useEffect(() => {
		if (token && hospitalId && !verificationAttempted) {
			setVerificationAttempted(true);
			verifyMutation.mutate({ hospitalId, token });
		}
	}, [token, hospitalId, verificationAttempted, verifyMutation]);

	// Wrapper component for consistent styling
	const PageWrapper = ({ children }: { children: React.ReactNode }) => (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/50 p-4">
			{/* Background decorations */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute top-1/4 right-0 h-96 w-96 translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
				<div className="-translate-x-1/2 absolute bottom-0 left-0 h-96 w-96 translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
			</div>

			{/* Logo */}
			<div className="absolute top-6 left-6">
				<Link to="/" className="flex items-center gap-2">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
						<UseHelyLogo className="h-5 w-5 text-primary" />
					</div>
					<span className="font-bold text-lg">useHely</span>
				</Link>
			</div>

			{children}
		</div>
	);

	// Missing parameters
	if (!token || !hospitalId) {
		return (
			<PageWrapper>
				<Card className="relative w-full max-w-md border-red-500/20 bg-card/80 backdrop-blur-sm">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
							<AlertCircle className="h-10 w-10 text-red-500" />
						</div>
						<h1 className="font-bold text-2xl">Invalid Verification Link</h1>
					</CardHeader>
					<CardContent className="space-y-4 text-center">
						<p className="text-muted-foreground">
							The verification link is missing required parameters. Please check
							your email and try clicking the link again.
						</p>
						<div className="flex flex-col gap-2">
							<Button asChild className="w-full">
								<Link to="/">Go to Home</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</PageWrapper>
		);
	}

	// Loading state
	if (verifyMutation.isPending) {
		return (
			<PageWrapper>
				<Card className="relative w-full max-w-md border-primary/20 bg-card/80 backdrop-blur-sm">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
							<Loader2 className="h-10 w-10 animate-spin text-primary" />
						</div>
						<h1 className="font-bold text-2xl">Verifying Your Hospital</h1>
					</CardHeader>
					<CardContent className="space-y-4 text-center">
						<p className="text-muted-foreground">
							Please wait while we verify your hospital account and set up your
							environment...
						</p>
						<div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
							<ShieldCheck className="h-4 w-4" />
							<span>Setting up roles and permissions</span>
						</div>
					</CardContent>
				</Card>
			</PageWrapper>
		);
	}

	// Error state
	if (verifyMutation.isError) {
		const error = verifyMutation.error as unknown as AuthError;
		return (
			<PageWrapper>
				<Card className="relative w-full max-w-md border-red-500/20 bg-card/80 backdrop-blur-sm">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
							<AlertCircle className="h-10 w-10 text-red-500" />
						</div>
						<h1 className="font-bold text-2xl">Verification Failed</h1>
					</CardHeader>
					<CardContent className="space-y-4 text-center">
						<p className="text-muted-foreground">
							{error?.message || "Failed to verify your hospital account."}
						</p>
						{error?.code === "TOKEN_EXPIRED" && (
							<div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
								<p className="text-amber-200 text-sm">
									Your verification link has expired (24 hours limit). Please
									register again to receive a new verification link.
								</p>
							</div>
						)}
						{error?.code === "ALREADY_VERIFIED" && (
							<div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
								<p className="text-green-200 text-sm">
									Good news! Your hospital has already been verified. You can
									proceed to sign in with your credentials.
								</p>
							</div>
						)}
						<div className="flex flex-col gap-2 pt-2">
							{error?.code === "ALREADY_VERIFIED" ? (
								<Button asChild className="w-full">
									<Link to="/login">Go to Login</Link>
								</Button>
							) : (
								<>
									<Button asChild className="w-full">
										<Link to="/register-hospital">Register Again</Link>
									</Button>
									<Button variant="outline" asChild className="w-full">
										<Link to="/">Go to Home</Link>
									</Button>
								</>
							)}
						</div>
					</CardContent>
				</Card>
			</PageWrapper>
		);
	}

	// Success state
	if (verifyMutation.isSuccess) {
		return (
			<PageWrapper>
				<Card className="relative w-full max-w-md border-green-500/20 bg-card/80 backdrop-blur-sm">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
							<CheckCircle2 className="h-10 w-10 text-green-500" />
						</div>
						<h1 className="font-bold text-2xl">Hospital Verified!</h1>
					</CardHeader>
					<CardContent className="space-y-4 text-center">
						<p className="text-muted-foreground">
							Your hospital has been successfully verified and activated. Your
							environment is ready!
						</p>
						<div className="rounded-lg border bg-muted/50 p-4">
							<p className="mb-3 font-medium text-sm">What's been set up:</p>
							<ul className="space-y-2 text-left text-sm">
								<li className="flex items-center gap-2 text-muted-foreground">
									<CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />6
									pre-defined roles with permissions
								</li>
								<li className="flex items-center gap-2 text-muted-foreground">
									<CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
									Administration department created
								</li>
								<li className="flex items-center gap-2 text-muted-foreground">
									<CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
									Admin account activated
								</li>
							</ul>
						</div>
						<div className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
							<Mail className="h-5 w-5 text-amber-400" />
							<p className="text-amber-200 text-sm">
								Check your email for login credentials
							</p>
						</div>
						<Button asChild className="w-full" size="lg">
							<Link to="/login">Proceed to Login</Link>
						</Button>
					</CardContent>
				</Card>
			</PageWrapper>
		);
	}

	// Default/idle state (waiting for effect to run)
	return (
		<PageWrapper>
			<Card className="relative w-full max-w-md border-primary/20 bg-card/80 backdrop-blur-sm">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
						<Loader2 className="h-10 w-10 animate-spin text-primary" />
					</div>
					<h1 className="font-bold text-2xl">Preparing Verification</h1>
				</CardHeader>
				<CardContent className="text-center">
					<p className="text-muted-foreground">
						Please wait while we prepare to verify your hospital...
					</p>
				</CardContent>
			</Card>
		</PageWrapper>
	);
}

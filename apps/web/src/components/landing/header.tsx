import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { UseHelyLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const navLinks = [
	{ href: "#features", label: "Features" },
	{ href: "#pricing", label: "Pricing" },
];

export function Header() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const isAuthenticated = useIsAuthenticated();

	return (
		<header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					{/* Logo */}
					<Link to="/" className="flex items-center gap-2">
						<UseHelyLogo className="h-6 w-6 text-primary" />
						<span className="font-bold text-lg">useHely</span>
					</Link>

					{/* Desktop Navigation */}
					<nav className="hidden items-center gap-6 md:flex">
						{navLinks.map((link) => (
							<a
								key={link.href}
								href={link.href}
								className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
							>
								{link.label}
							</a>
						))}
					</nav>

					{/* Desktop CTA */}
					<div className="hidden items-center gap-3 md:flex">
						{isAuthenticated ? (
							<Button asChild>
								<Link to="/dashboard">Go to Dashboard</Link>
							</Button>
						) : (
							<>
								<Button variant="ghost" asChild>
									<Link to="/login">Log In</Link>
								</Button>
								<Button asChild>
									<Link to="/register-hospital">Register Hospital</Link>
								</Button>
							</>
						)}
					</div>

					{/* Mobile menu button */}
					<button
						type="button"
						className="md:hidden"
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
					>
						{mobileMenuOpen ? (
							<X className="h-6 w-6" />
						) : (
							<Menu className="h-6 w-6" />
						)}
					</button>
				</div>
			</div>

			{/* Mobile menu */}
			<div
				className={cn(
					"border-t md:hidden",
					mobileMenuOpen ? "block" : "hidden",
				)}
			>
				<div className="space-y-1 px-4 py-4">
					{navLinks.map((link) => (
						<a
							key={link.href}
							href={link.href}
							className="block rounded-md px-3 py-2 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
							onClick={() => setMobileMenuOpen(false)}
						>
							{link.label}
						</a>
					))}
					<div className="mt-4 flex flex-col gap-2 pt-4">
						{isAuthenticated ? (
							<Button asChild>
								<Link to="/dashboard">Go to Dashboard</Link>
							</Button>
						) : (
							<>
								<Button variant="outline" asChild>
									<Link to="/login">Log In</Link>
								</Button>
								<Button asChild>
									<Link to="/register-hospital">Register Hospital</Link>
								</Button>
							</>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}

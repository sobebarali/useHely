import { Link } from "@tanstack/react-router";
import { Building2, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
	{ href: "#features", label: "Features" },
	{ href: "#pricing", label: "Pricing" },
	{ href: "http://localhost:4321", label: "API Docs", external: true },
];

export function Header() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					{/* Logo */}
					<Link to="/" className="flex items-center gap-2">
						<Building2 className="h-6 w-6 text-primary" />
						<span className="font-bold text-lg">HMS</span>
					</Link>

					{/* Desktop Navigation */}
					<nav className="hidden items-center gap-6 md:flex">
						{navLinks.map((link) =>
							link.external ? (
								<a
									key={link.href}
									href={link.href}
									target="_blank"
									rel="noopener noreferrer"
									className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
								>
									{link.label}
								</a>
							) : (
								<a
									key={link.href}
									href={link.href}
									className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
								>
									{link.label}
								</a>
							),
						)}
					</nav>

					{/* Desktop CTA */}
					<div className="hidden items-center gap-3 md:flex">
						<Button variant="ghost" asChild>
							<Link to="/login">Log In</Link>
						</Button>
						<Button asChild>
							<Link to="/login">Register Hospital</Link>
						</Button>
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
					{navLinks.map((link) =>
						link.external ? (
							<a
								key={link.href}
								href={link.href}
								target="_blank"
								rel="noopener noreferrer"
								className="block rounded-md px-3 py-2 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
								onClick={() => setMobileMenuOpen(false)}
							>
								{link.label}
							</a>
						) : (
							<a
								key={link.href}
								href={link.href}
								className="block rounded-md px-3 py-2 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
								onClick={() => setMobileMenuOpen(false)}
							>
								{link.label}
							</a>
						),
					)}
					<div className="mt-4 flex flex-col gap-2 pt-4">
						<Button variant="outline" asChild>
							<Link to="/login">Log In</Link>
						</Button>
						<Button asChild>
							<Link to="/login">Register Hospital</Link>
						</Button>
					</div>
				</div>
			</div>
		</header>
	);
}

import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { UseHelyLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function Footer() {
	return (
		<footer className="border-t bg-muted/30">
			{/* CTA Section */}
			<div className="border-b px-4 py-16 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-4xl text-center">
					<h2 className="font-bold text-2xl sm:text-3xl">
						Ready to Transform Your Hospital Operations?
					</h2>
					<p className="mx-auto mt-4 max-w-xl text-muted-foreground">
						Join hospitals that have modernized their operations with our
						comprehensive management system.
					</p>
					<div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
						<Button size="lg" asChild>
							<Link to="/login">
								Start Free Trial
								<ArrowRight className="ml-2 h-4 w-4" />
							</Link>
						</Button>
						<Button variant="outline" size="lg" asChild>
							<a href="#pricing">View Pricing</a>
						</Button>
					</div>
				</div>
			</div>

			{/* Footer Links */}
			<div className="px-4 py-12 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
						{/* Brand */}
						<div>
							<div className="flex items-center gap-2">
								<UseHelyLogo className="h-6 w-6 text-primary" />
								<span className="font-bold text-lg">useHely</span>
							</div>
							<p className="mt-4 text-muted-foreground text-sm">
								Simplifying healthcare operations for hospitals, clinics, and
								practices.
							</p>
							<a
								href="mailto:info@usehely.com"
								className="mt-3 inline-block text-muted-foreground text-sm hover:text-foreground"
							>
								info@usehely.com
							</a>
						</div>

						{/* Product */}
						<div>
							<h3 className="font-semibold">Product</h3>
							<ul className="mt-4 space-y-2 text-muted-foreground text-sm">
								<li>
									<a href="#features" className="hover:text-foreground">
										Features
									</a>
								</li>
								<li>
									<a href="#pricing" className="hover:text-foreground">
										Pricing
									</a>
								</li>
							</ul>
						</div>

						{/* Resources */}
						<div>
							<h3 className="font-semibold">Resources</h3>
							<ul className="mt-4 space-y-2 text-muted-foreground text-sm">
								<li>
									<span className="cursor-not-allowed opacity-60">
										Getting Started
									</span>
								</li>
								<li>
									<span className="cursor-not-allowed opacity-60">
										Help Center
									</span>
								</li>
								<li>
									<span className="cursor-not-allowed opacity-60">
										Video Tutorials
									</span>
								</li>
								<li>
									<span className="cursor-not-allowed opacity-60">
										Status Page
									</span>
								</li>
							</ul>
						</div>

						{/* Company */}
						<div>
							<h3 className="font-semibold">Company</h3>
							<ul className="mt-4 space-y-2 text-muted-foreground text-sm">
								<li>
									<span className="cursor-not-allowed opacity-60">About</span>
								</li>
								<li>
									<a
										href="mailto:info@usehely.com"
										className="hover:text-foreground"
									>
										Contact
									</a>
								</li>
								<li>
									<span className="cursor-not-allowed opacity-60">
										Privacy Policy
									</span>
								</li>
								<li>
									<span className="cursor-not-allowed opacity-60">
										Terms of Service
									</span>
								</li>
							</ul>
						</div>
					</div>

					{/* Bottom */}
					<div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
						<p className="text-muted-foreground text-sm">
							&copy; {new Date().getFullYear()} useHely. All rights reserved.
						</p>
						<div className="flex items-center gap-4">
							<a
								href="https://github.com"
								target="_blank"
								rel="noopener noreferrer"
								className="text-muted-foreground transition-colors hover:text-foreground"
							>
								<svg
									className="h-5 w-5"
									fill="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										fillRule="evenodd"
										d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
										clipRule="evenodd"
									/>
								</svg>
								<span className="sr-only">GitHub</span>
							</a>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}

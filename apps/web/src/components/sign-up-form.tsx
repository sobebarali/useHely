import { Button } from "./ui/button";

export default function SignUpForm({
	onSwitchToSignIn,
}: {
	onSwitchToSignIn: () => void;
}) {
	return (
		<div className="mx-auto mt-10 w-full max-w-md p-6">
			<h1 className="mb-6 text-center font-bold text-3xl">Create Account</h1>

			<div className="space-y-4 text-center">
				<p className="text-muted-foreground">
					To create an account, you need to either:
				</p>

				<div className="space-y-3">
					<div className="rounded-lg border p-4">
						<h3 className="font-medium">Register a New Hospital</h3>
						<p className="mt-1 text-muted-foreground text-sm">
							If you're setting up a new hospital, register your organization
							and you'll be created as the hospital admin.
						</p>
						<Button className="mt-3 w-full" variant="outline" asChild>
							<a href="/register-hospital">Register Hospital</a>
						</Button>
					</div>

					<div className="rounded-lg border p-4">
						<h3 className="font-medium">Contact Your Administrator</h3>
						<p className="mt-1 text-muted-foreground text-sm">
							If your hospital is already registered, ask your hospital
							administrator to create an account for you.
						</p>
					</div>
				</div>
			</div>

			<div className="mt-6 text-center">
				<Button
					variant="link"
					onClick={onSwitchToSignIn}
					className="text-indigo-600 hover:text-indigo-800"
				>
					Already have an account? Sign In
				</Button>
			</div>
		</div>
	);
}

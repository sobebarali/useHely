import { createFileRoute, redirect } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/settings/general")({
	component: GeneralSettingsPage,
	beforeLoad: async () => {
		if (!authClient.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
});

function GeneralSettingsPage() {
	return (
		<div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
			{/* Header */}
			<div>
				<h1 className="font-bold text-2xl">General Settings</h1>
				<p className="text-muted-foreground">
					Configure general application settings
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Settings className="h-5 w-5" />
						Application Settings
					</CardTitle>
					<CardDescription>
						General settings for the application
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						General settings configuration coming soon.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

import { Link, useNavigate } from "@tanstack/react-router";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, useSignOut } from "@/hooks/use-auth";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

export default function UserMenu() {
	const navigate = useNavigate();
	const { data: session, isLoading } = useSession();
	const signOutMutation = useSignOut();

	if (isLoading) {
		return <Skeleton className="h-9 w-24" />;
	}

	if (!session) {
		return (
			<Button variant="outline" asChild>
				<Link to="/login">Sign In</Link>
			</Button>
		);
	}

	const displayName =
		`${session.firstName} ${session.lastName}`.trim() || session.username;

	const handleSignOut = async () => {
		await signOutMutation.mutateAsync();
		navigate({
			to: "/",
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">{displayName}</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="bg-card">
				<DropdownMenuLabel>My Account</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem>{session.email}</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Button
						variant="destructive"
						className="w-full"
						onClick={handleSignOut}
						disabled={signOutMutation.isPending}
					>
						{signOutMutation.isPending ? "Signing out..." : "Sign Out"}
					</Button>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

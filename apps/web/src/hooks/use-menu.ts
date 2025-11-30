/**
 * React hooks for menu API using TanStack Query
 */

import { useQuery } from "@tanstack/react-query";
import {
	type GetMenuResponse,
	type MenuChildItem,
	type MenuItem,
	menuClient,
} from "../lib/menu-client";

// Query keys
export const menuKeys = {
	all: ["menu"] as const,
	get: () => [...menuKeys.all, "get"] as const,
};

/**
 * Hook to get role-based menu for the authenticated user
 */
export function useMenu() {
	return useQuery({
		queryKey: menuKeys.get(),
		queryFn: () => menuClient.getMenu(),
		staleTime: 1000 * 60 * 10, // 10 minutes - menu rarely changes
		retry: false,
	});
}

export type { GetMenuResponse, MenuItem, MenuChildItem };

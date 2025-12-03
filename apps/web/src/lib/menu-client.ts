/**
 * Menu API Client
 *
 * Fetches role-based menu from the server.
 * The server filters menu items based on user permissions.
 */

import { authenticatedRequest } from "./api-client";

// Types matching server validation types
export interface MenuChildItem {
	id: string;
	label: string;
	path: string;
	permission: string;
	order: number;
}

export interface MenuItem {
	id: string;
	label: string;
	icon: string;
	path?: string;
	permission: string;
	children?: MenuChildItem[];
	order: number;
	visible: boolean;
}

export interface GetMenuResponse {
	menu: MenuItem[];
	permissions: string[];
}

export interface MenuError {
	code: string;
	message: string;
}

/**
 * Fetch menu for the authenticated user
 * The server filters menu items based on user's permissions
 */
export async function getMenu(): Promise<GetMenuResponse> {
	return authenticatedRequest<GetMenuResponse>("/api/menu");
}

export const menuClient = {
	getMenu,
};

export default menuClient;

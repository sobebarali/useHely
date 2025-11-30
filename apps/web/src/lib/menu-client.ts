/**
 * Menu API Client
 *
 * Fetches role-based menu from the server.
 * The server filters menu items based on user permissions.
 */

import { getAccessToken } from "./auth-client";

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "";

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
	const accessToken = getAccessToken();

	if (!accessToken) {
		throw { code: "UNAUTHORIZED", message: "Not authenticated" } as MenuError;
	}

	const response = await fetch(`${API_BASE_URL}/api/menu`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${accessToken}`,
		},
	});

	const data = await response.json();

	if (!response.ok) {
		throw {
			code: data.code || "UNKNOWN_ERROR",
			message: data.message || "Failed to fetch menu",
		} as MenuError;
	}

	return data.data;
}

export const menuClient = {
	getMenu,
};

export default menuClient;

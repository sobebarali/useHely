/**
 * Constants index
 *
 * Central export point for all application constants.
 * Import from "@/constants" or "@/constants/{domain}.constants"
 */

// Auth constants
export {
	AUTH_ERROR_CODES,
	type AuthErrorCode,
	GRANT_TYPES,
	TOKEN_CONFIG,
	TOKEN_TYPES,
} from "./auth.constants";
// Cache constants
export {
	AUTH_CACHE_KEYS,
	AUTH_CACHE_TTL,
	type AuthCacheKeyPrefix,
	HOSPITAL_CACHE_KEYS,
	HOSPITAL_CACHE_TTL,
	type HospitalCacheKeyPrefix,
	SECURITY_THRESHOLDS,
	tenantCacheKey,
} from "./cache.constants";
// HTTP constants
export {
	ERROR_CODES,
	type ErrorCode,
	HTTP_STATUS,
} from "./http.constants";
// RBAC constants
export {
	Actions,
	getEffectivePermissions,
	hasHigherOrEqualAuthority,
	hasPermission,
	type Permission,
	Permissions,
	Resources,
	RoleHierarchy,
	type RoleName,
	RoleNames,
	RolePermissions,
} from "./rbac.constants";

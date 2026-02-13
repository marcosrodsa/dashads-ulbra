import { UserRole } from "@/contexts/auth-context-core";

/**
 * Capability-based RBAC Matrix
 * maps routes or features to the roles allowed to access them.
 */
export const PERMISSION_MATRIX: Record<string, UserRole[]> = {
    // Dashboards (Open to all authenticated roles)
    "/budget": ["super_admin", "admin", "viewer"],
    "/performance": ["super_admin", "admin", "viewer"],
    "/creatives": ["super_admin", "admin", "viewer"],

    // Operations (Admin and Super Admin)
    "/classificador": ["super_admin", "admin"],
    "/cadastros/usuarios": ["super_admin", "admin"],

    // System & Technical (Super Admin Only)
    "/status": ["super_admin"],
    "/cadastros/tags": ["super_admin"],
};

/**
 * Helper to check if a user with a specific role has access to a path.
 * 
 * @param role The current user's role
 * @param path The URL path to check
 * @returns boolean indicating access
 */
export function hasAccess(role: UserRole, path: string): boolean {
    if (!role) return false;

    // Super Admin always has access to everything
    if (role === "super_admin") return true;

    // Find the closest matching rule in the matrix
    // We check for exact matches first
    if (PERMISSION_MATRIX[path]) {
        return PERMISSION_MATRIX[path].includes(role);
    }

    // Default: If no rule is defined, assume it's protected and only super_admin (handled above) can see it.
    // Or for base layout paths, allow access.
    if (path === "/" || path === "" || path === "/login") return true;

    return false;
}

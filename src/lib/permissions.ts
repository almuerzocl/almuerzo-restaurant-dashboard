import { Profile } from "@/types";

/**
 * Skill: Role-Based Access Control (RBAC)
 * Local implementation for the Restaurant Dashboard.
 * All comparisons are CASE-INSENSITIVE and standardized.
 */

export type Role = 
    | 'ADMIN' 
    | 'OWNER' 
    | 'SUPER_ADMIN' 
    | 'RESTAURANT_ADMIN' 
    | 'OPERATIONS_MANAGER' 
    | 'RESERVATION_MANAGER' 
    | 'TAKEAWAY_MANAGER' 
    | 'MENU_MANAGER' 
    | 'USER'
    | 'RESERVAS'
    | 'PEDIDOS'
    | 'MENU';

/**
 * Normalizes a role string or profile object to an uppercase role string.
 */
const getNormalizedRole = (input: Profile | string | null | undefined): string | null => {
    if (!input) return null;
    if (typeof input === 'string') return input.toUpperCase();
    return input.role?.toUpperCase() || null;
};

/**
 * Checks if the input has any of the specified roles (Case-Insensitive).
 */
export function hasRole(input: Profile | string | null | undefined, roles: Role | Role[]): boolean {
    const role = getNormalizedRole(input);
    if (!role) return false;
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.some(r => r.toUpperCase() === role);
}

/**
 * Top-level Admin Check (equivalent to Core isAdmin)
 */
export const isAdmin = (input: Profile | string | null | undefined): boolean => {
    return hasRole(input, ['ADMIN', 'OWNER', 'SUPER_ADMIN', 'RESTAURANT_ADMIN']);
};

/**
 * Super Admin (Platform-wide)
 */
export const isSuperAdmin = (input: Profile | string | null | undefined): boolean => {
    return hasRole(input, 'SUPER_ADMIN');
};

/**
 * Checks if the user can manage reservations.
 */
export const canViewReservations = (input: Profile | string | null | undefined): boolean => {
    return isAdmin(input) || hasRole(input, ['OPERATIONS_MANAGER', 'RESERVATION_MANAGER', 'RESERVAS']);
};

/**
 * Checks if the user can manage takeaway orders.
 */
export const canViewTakeaway = (input: Profile | string | null | undefined): boolean => {
    return isAdmin(input) || hasRole(input, ['OPERATIONS_MANAGER', 'TAKEAWAY_MANAGER', 'PEDIDOS']);
};

/**
 * Checks if the user can manage the menu.
 */
export const canViewMenu = (input: Profile | string | null | undefined): boolean => {
    return isAdmin(input) || hasRole(input, ['OPERATIONS_MANAGER', 'MENU_MANAGER', 'MENU']);
};

/**
 * Checks if the user can view account/settings.
 */
export const canViewAccount = (input: Profile | string | null | undefined): boolean => {
    return isAdmin(input);
};

export const canViewSettings = (input: Profile | string | null | undefined): boolean => {
    return isAdmin(input);
};


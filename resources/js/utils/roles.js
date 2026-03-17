export const CONFIRMATION_AGENT_ROLES = ['confirmation_agent', 'agent_confirmation'];
export const ADMIN_ROLES = ['admin', 'superadmin'];

export function isConfirmationAgentRole(roleSlug) {
    return CONFIRMATION_AGENT_ROLES.includes(roleSlug);
}

export function isAdminRole(roleSlug) {
    return ADMIN_ROLES.includes(roleSlug);
}

export function isVendorRole(roleSlug) {
    return roleSlug === 'vendor';
}

export function isDeliveryPersonRole(roleSlug) {
    return ['delivery_person', 'delivery'].includes(roleSlug);
}

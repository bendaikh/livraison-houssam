/** Base URL segment for the authenticated panel (must match router in app.jsx) */
export const APP_BASE = '/dashboard';

/**
 * @param {string} path - In-app path starting with / (e.g. '/', '/products', '/orders/1')
 * @returns {string} Full path under APP_BASE
 */
export function appPath(path) {
    if (!path || path === '/') {
        return APP_BASE;
    }
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (normalized === APP_BASE || normalized.startsWith(`${APP_BASE}/`)) {
        return normalized;
    }
    return `${APP_BASE}${normalized}`;
}

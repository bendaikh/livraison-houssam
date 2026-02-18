# Infinite Reload Loop Fix

## Issue
The application was continuously reloading every 1-2 seconds when accessing any page, especially the login page. The browser would get stuck in an infinite loop.

## Root Cause
The infinite reload loop was caused by a conflict between:
1. The `SettingsProvider` context fetching settings on mount (even on the login page)
2. The API interceptor in `api.js` redirecting to `/login` on 401 errors
3. Already being on the `/login` page

### The Loop:
1. User visits `/login` (not authenticated)
2. `SettingsProvider` tries to fetch `/api/settings` 
3. API returns 401 Unauthorized (no valid token)
4. API interceptor catches 401 and redirects to `/login`
5. Page reloads and goes back to step 1
6. **Infinite loop continues**

## Solution
Modified the API response interceptor to check if the user is already on the login page before redirecting. This prevents the redirect loop when the user is already on the login page.

### Code Change

**File:** `resources/js/utils/api.js`

**Before (Buggy Code):**
```javascript
// Handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';  // ❌ Always redirects, even if already on /login
        }
        return Promise.reject(error);
    }
);
```

**After (Fixed Code):**
```javascript
// Handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            // Only redirect if not already on login page to prevent infinite loop
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);
```

## What Changed
- Added a condition: `if (!window.location.pathname.includes('/login'))`
- Now the redirect only happens when the user is NOT already on the login page
- The 401 error is still handled (token removed), but no unnecessary redirect occurs

## Impact

### ✅ Fixed:
- No more infinite reload loop on login page
- Settings API can fail gracefully without causing redirects
- Users can access the login page without issues
- Page stops reloading continuously

### ✅ Still Works:
- Automatic logout on 401 errors when authenticated
- Redirect to login when session expires on protected pages
- Token removal on unauthorized requests
- All existing authentication flows

## How to Verify the Fix

1. **Before Login:**
   - Visit the login page
   - **Expected:** Page loads once and stays stable (no reloading)
   - **Expected:** No infinite loop in browser console or network tab

2. **After Login:**
   - Log in successfully
   - Navigate to any page
   - Clear localStorage or expire the token
   - Make any API request
   - **Expected:** Automatically redirected to login page (only once)

3. **Network Tab Check:**
   - Open browser DevTools → Network tab
   - Visit login page
   - **Expected:** Only see initial page load and one `/api/settings` call
   - **Expected:** No repeated `/login` requests

## Technical Notes

- The check uses `window.location.pathname.includes('/login')` instead of exact match to handle variations like `/login?redirect=/dashboard`
- The token is still removed from localStorage even when on the login page
- The error is still rejected and propagated to the calling code
- This fix is compatible with React Router's client-side navigation

## Related Components

- **`resources/js/utils/api.js`** - API interceptor (fixed)
- **`resources/js/contexts/SettingsContext.jsx`** - Fetches settings on mount
- **`resources/js/contexts/AuthContext.jsx`** - Handles authentication
- **`resources/js/app.jsx`** - Wraps app with both providers

## Alternative Solutions Considered

1. **Don't fetch settings on unauthenticated pages** - Would require conditional rendering logic in multiple places
2. **Make /api/settings public** - Security concern, settings might contain sensitive data
3. **Separate settings for public vs authenticated** - More complex, unnecessary for this use case
4. **Use React Router navigation instead of window.location** - Would still cause re-renders and potential loops

The chosen solution is the simplest and most effective fix.

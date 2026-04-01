# Custom API Integration Feature

## Overview
A new "Custom API" integration has been added to the application that allows users (both admins and vendors) to connect their own platforms, websites, or mobile apps to the system via a secure API.

## What Was Implemented

### 1. Frontend Components

#### New Page: `CustomApiIntegrationPage.jsx`
- Located at: `resources/js/pages/ApiIntegrations/CustomApiIntegrationPage.jsx`
- Features:
  - Integration setup and configuration
  - API key generation and regeneration
  - API key visibility toggle (show/hide)
  - Copy-to-clipboard functionality for API key and base URL
  - Authentication header examples
  - List of available API endpoints with descriptions
  - Security best practices and use cases
  - Status tracking and timestamps

#### Updated Components:
1. **ApiIntegrations.jsx**
   - Added "Custom API" card to the integrations list
   - Icon: 🔌
   - Available to both admins and vendors

2. **MainLayout.jsx**
   - Added "Custom API" menu item in sidebar under "API Integrations"
   - Visible to both admins and vendors
   - Icon: Globe

3. **app.jsx**
   - Added route: `/dashboard/api-integrations/custom-api`
   - Imported and configured `CustomApiIntegrationPage` component

### 2. Backend API

#### ApiIntegrationController Updates
Located at: `app/Http/Controllers/ApiIntegrationController.php`

**New Method:**
```php
generateCustomApiKey(Request $request)
```
- Generates a secure 64-character API key with prefix `capi_`
- Stores the key in integration credentials
- Returns updated integration with the new key
- Handles vendor-specific permission checks

**Updated Methods:**
1. `index()` - Now includes `custom_api` integrations for vendors
2. `store()` - Accepts `custom_api` as a valid type/provider
3. `update()` - Accepts `custom_api` as a valid type/provider

#### Routes
New route added in `routes/api.php`:
```php
Route::post('/api-integrations/custom-api/generate-key', [ApiIntegrationController::class, 'generateCustomApiKey']);
```

### 3. Translations

Updated all three language files:
- `resources/js/i18n/locales/en.json`
- `resources/js/i18n/locales/fr.json`
- `resources/js/i18n/locales/ar.json`

Added translations:
- `admin.menu.customApi`: "Custom API" / "API Personnalisée" / "API مخصص"
- `admin.menu.customApiDesc`: "Connect your platform" / "Connecter votre plateforme" / "ربط منصتك"

## How It Works

### For Users:

1. **Setup Integration**
   - Navigate to API Integrations → Custom API
   - Create the integration by giving it a name
   - Enable/disable the integration as needed

2. **Generate API Key**
   - Click "Generate API Key" button
   - A secure API key is generated (format: `capi_[64 hex characters]`)
   - Copy the API key and store it securely

3. **Use the API**
   - Base URL: `https://your-domain.com/api`
   - Authentication: Include header `Authorization: Bearer YOUR_API_KEY`
   - Available endpoints are listed in the UI

### API Endpoints Available:

The UI displays these endpoints (examples):
- `POST /api/orders` - Create a new order
- `GET /api/orders` - Get all orders
- `GET /api/orders/{id}` - Get specific order
- `PATCH /api/orders/{id}/status` - Update order status
- `GET /api/products` - Get all products
- `GET /api/products/{id}` - Get specific product

### Security Features:

1. **Secure Key Generation**: Uses `random_bytes(32)` for cryptographically secure random keys
2. **Key Visibility Toggle**: API keys are masked by default
3. **Permission Checks**: Vendors can only access their own integrations
4. **HTTPS Requirement**: Encouraged in the UI
5. **Key Regeneration**: Users can regenerate keys if compromised

## Access Control

- **Admins**: Can create and manage Custom API integrations for the entire system
- **Vendors**: Can create and manage their own Custom API integrations
- **Confirmation Agents**: Hidden (not available)
- **Delivery Persons**: Hidden (not available)

## Use Cases

As displayed in the UI:
- Connect your e-commerce website
- Integrate mobile applications
- Build custom order management tools
- Automate product synchronization
- Create custom reporting dashboards
- Integrate with third-party systems

## Technical Details

### Database Schema
Uses existing `api_integrations` table with:
- `type`: 'custom_api'
- `provider`: 'custom_api'
- `credentials`: JSON field storing `{"api_key": "capi_..."}`
- `is_active`: Boolean for enabling/disabling
- `vendor_id`: Optional, links to specific vendor

### API Key Format
- Prefix: `capi_`
- Length: 69 characters total (5 prefix + 64 hex)
- Example: `capi_a1b2c3d4e5f6...` (64 random hex characters)

## Future Enhancements (Not Implemented)

Potential improvements for future development:
1. API usage analytics and rate limiting
2. Multiple API keys per integration
3. Key expiration dates
4. Scope-based permissions (read-only, write-only, etc.)
5. API request logging and monitoring
6. Webhook configuration for custom events
7. API documentation viewer within the app
8. Test API connection feature

## Files Modified/Created

### Created:
- `resources/js/pages/ApiIntegrations/CustomApiIntegrationPage.jsx`
- `CUSTOM_API_INTEGRATION.md` (this file)

### Modified:
- `resources/js/pages/ApiIntegrations/ApiIntegrations.jsx`
- `resources/js/layouts/MainLayout.jsx`
- `resources/js/app.jsx`
- `resources/js/i18n/locales/en.json`
- `resources/js/i18n/locales/fr.json`
- `resources/js/i18n/locales/ar.json`
- `app/Http/Controllers/ApiIntegrationController.php`
- `routes/api.php`

## Testing

To test the feature:
1. Login as admin or vendor
2. Navigate to API Integrations in the sidebar
3. Click on "Custom API" card
4. Create an integration
5. Generate an API key
6. Test copying the key and base URL
7. Verify the key is stored correctly in the database
8. Try regenerating the key

## Notes

- The CSS warning about `@import` in the terminal is pre-existing and not related to this feature
- The dev server should automatically reload with the changes (HMR)
- API key authentication middleware would need to be implemented separately for actual API usage

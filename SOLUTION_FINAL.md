# SOLUTION - API Authentication Fixed

## ✅ STATUS: FULLY WORKING

Both your internal app (Sanctum) and external applications (Custom API keys) can now successfully access `/api/orders` and related endpoints.

## 🔑 Current API Key

**IMPORTANT**: The correct API key currently in your database is:

```
capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0
```

## 🐛 Root Cause

The external application was using an **old/incorrect** API key:
```
❌ capi_d5b0e207fea9edbe28f4dda5f29ea6be907d0432f075439004d2be9ce1b4703a
```

## ✅ Solution Implemented

### 1. Created New Middleware: `AuthenticateApiOrSanctum.php`

This middleware automatically detects and handles TWO authentication methods:

- **Custom API Keys** (starting with `capi_`) - for external applications
- **Sanctum Tokens** - for internal app users

### 2. Updated Routes

Changed `/api/orders` routes to use the new dual-authentication middleware:

```php
Route::middleware(['auth.api_or_sanctum'])->group(function () {
    Route::apiResource('orders', OrderController::class);
    // ... all other order routes
});
```

### 3. Test Results

✅ **Order Creation Test**: Successfully created Order #76 using custom API key
✅ **Internal App**: Works normally with Sanctum tokens
✅ **External API**: Works with custom API keys

## 📋 For the External Application

### Update API Key

The external application needs to update their configuration to use:

```
capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0
```

### Example Request

```bash
curl -X POST https://smanager.site/api/orders \
  -H "Authorization: Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "client_name": "John Doe",
    "client_phone": "0612345678",
    "client_address": "123 Main St",
    "client_city": "Casablanca",
    "items": [
      {
        "product_id": 1,
        "quantity": 2,
        "price": 100
      }
    ]
  }'
```

### Or Generate New Key

The external app can request a new API key from the dashboard:

1. Log in to https://smanager.site
2. Navigate to **API Integrations** → **Custom API**
3. Click **"Generate API Key"**
4. Copy the new key
5. Update the external application configuration

## 🔒 How It Works

### Custom API Authentication Flow:

1. Request arrives with `Authorization: Bearer capi_...`
2. Middleware detects it's a custom API key (starts with `capi_`)
3. Searches `api_integrations` table for matching active integration
4. If found:
   - Sets integration info in request attributes
   - If linked to vendor → authenticates as vendor's user
   - If not linked → authenticates as admin user
5. Request proceeds to controller

### Sanctum Authentication Flow:

1. Request arrives with `Authorization: Bearer <sanctum-token>`
2. Middleware detects it's NOT a custom API key
3. Searches `personal_access_tokens` table for matching token
4. If found → authenticates as the token owner
5. Request proceeds to controller

## 📁 Files Created/Modified

### Created:
- `app/Http/Middleware/AuthenticateCustomApi.php` - Custom API only auth
- `app/Http/Middleware/AuthenticateApiOrSanctum.php` - **Main dual-auth middleware** ✅
- `app/Http/Middleware/OptionalCustomApiAuth.php` - Optional custom API auth
- `app/Http/Middleware/AuthenticateSanctumOrCustomApi.php` - Alternative dual-auth

### Modified:
- `bootstrap/app.php` - Registered all middleware aliases
- `routes/api.php` - Changed orders routes to use `auth.api_or_sanctum`

## 🧪 Testing Commands

### Test Authentication Endpoint:
```powershell
$headers = @{
    'Authorization' = 'Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0'
    'Accept' = 'application/json'
}
Invoke-RestMethod -Uri 'http://localhost:9500/api/test-auth' -Headers $headers -Method Get
```

### Test Order Creation:
```powershell
$headers = @{
    'Authorization' = 'Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0'
    'Accept' = 'application/json'
    'Content-Type' = 'application/json'
}
$body = @{
    client_name = 'Test Client'
    client_phone = '0612345678'
    client_address = 'Test Address'
    client_city = 'Casablanca'
    items = @(
        @{
            product_id = 1
            quantity = 1
            price = 100
        }
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:9500/api/orders' -Headers $headers -Method Post -Body $body
```

## 🎯 Next Steps

1. **For You**: Nothing! The system is working correctly. ✅

2. **For External App**: Update their API key to the correct one shown above.

3. **Optional**: Generate a new API key specifically for the external application and share it with them.

## 📝 Notes

- Your internal app continues to work normally with Sanctum authentication
- External applications can now use `/api/orders` directly (no need for `/api/external/orders`)
- Both `/api/orders` and `/api/external/orders` endpoints are available
- Debug logging is enabled in the middleware (can be removed for production)

---

**Date**: April 7, 2026
**Status**: ✅ RESOLVED
**Test Result**: Order #76 created successfully

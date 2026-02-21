# Vendor Role System

## Overview

The application now supports a **Vendor Role** with restricted access and personalized views. Vendors can only see their own data and have limited access to certain features.

## Features

### 1. Restricted Navigation Menu

Vendors see a simplified menu with only relevant sections:

**Visible to Vendors:**
- ✅ **Dashboard** - Shows vendor-specific statistics
- ✅ **Marketplace** - Shows only products assigned to them
- ✅ **Orders** - Shows only their own orders
- ✅ **API Integrations** - Only Shopify integration
- ✅ **Settings** - System settings

**Hidden from Vendors:**
- ❌ Products (internal inventory management)
- ❌ Stock management
- ❌ Sellers management
- ❌ Expenses tracking
- ❌ User Management
- ❌ Tawsilex integration
- ❌ BMDelivery integration

### 2. Dashboard Filtering

When a vendor logs in, the dashboard shows **only their data**:

**Statistics Filtered:**
- Sales totals (only from their orders)
- Order counts by status (only their orders)
- Revenue statistics (only from their sales)
- Recent orders (only their orders)
- Top products (only products they sold)
- Top clients (only clients who ordered from them)
- Charts data (only their sales data)

**Hidden from Vendors:**
- Expense statistics
- Low stock products
- Other vendors' data
- Top vendors ranking

### 3. Orders Filtering

**Backend:** `OrderController@index` automatically filters orders:
```php
// If user is a vendor, only show their orders
$user = $request->user();
if ($user && $user->role && $user->role->slug === 'vendor') {
    $vendor = \App\Models\Vendor::where('user_id', $user->id)->first();
    if ($vendor) {
        $query->where('vendor_id', $vendor->id);
    }
}
```

**Result:** Vendors can only see and manage orders assigned to them.

### 4. Marketplace Filtering

**Backend:** `MarketplaceController@index` shows only vendor's products:
```php
// If user is a vendor, only show their assigned products
if ($user && $user->role && $user->role->slug === 'vendor') {
    $vendor = Vendor::where('user_id', $user->id)->first();
    
    // Get only products assigned to this vendor
    $query = $vendor->marketplaceProducts()
        ->with(['category', 'vendor']);
}
```

**Result:** Vendors can only view products that have been assigned to them through the marketplace.

### 5. API Integrations Filtering

**Backend:** `ApiIntegrationController@index` restricts integrations:
```php
// If user is a vendor, only show Shopify integration linked to them
if ($user && $user->role && $user->role->slug === 'vendor') {
    $vendor = \App\Models\Vendor::where('user_id', $user->id)->first();
    
    if ($vendor) {
        // Show only Shopify integrations
        $query->where('type', 'shopify')
              ->where(function ($q) use ($vendor) {
                  $q->where('vendor_id', $vendor->id)
                    ->orWhereNull('vendor_id');
              });
    }
}
```

**Frontend:** Menu shows only Shopify under API Integrations:
```javascript
subItems: user?.role?.slug === 'vendor' 
    ? [
        // Vendors only see Shopify
        { path: '/api-integrations/shopify', icon: ShoppingCart, label: 'Shopify' },
      ]
    : [
        // Admins see all integrations
        { path: '/api-integrations/shopify', icon: ShoppingCart, label: 'Shopify' },
        { path: '/api-integrations/tawsilex', icon: Package, label: 'Tawsilex' },
        { path: '/api-integrations/bmdelivery', icon: Box, label: 'BMDelivery' }
      ]
```

**Result:** Vendors can only connect and manage their Shopify store, not delivery services.

## How to Create a Vendor with Login

### Step 1: Create Vendor Account

1. Go to **Sellers** page (admin only)
2. Click **"Add Seller"**
3. Fill in the form:
   - **Name:** Vendor's name
   - **Email:** Vendor's email (will be used for login)
   - **Password:** Set a password
   - **Confirm Password:** Confirm the password
   - Other vendor details (address, commission, etc.)
4. Click **Save**

### Step 2: System Actions

When you create a vendor, the system automatically:

1. **Creates a User account** with:
   - Email from the vendor form
   - Password (encrypted)
   - Role: `vendor`
   - Active status: `true`

2. **Creates a Vendor profile** linked to the user via `user_id`

3. **Links them together** so the vendor can log in with their credentials

### Step 3: Vendor Login

The vendor can now:
1. Go to the login page
2. Enter their **email** and **password**
3. Log in and see only their own dashboard and data

## Technical Implementation

### Database Schema

**Added to `vendors` table:**
```php
$table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
```

This links each vendor to a user account for authentication.

### Backend Changes

**Files Modified:**
1. `app/Http/Controllers/OrderController.php` - Filters orders by vendor
2. `app/Http/Controllers/MarketplaceController.php` - Filters products by vendor
3. `app/Http/Controllers/ApiIntegrationController.php` - Filters integrations by vendor
4. `app/Http/Controllers/DashboardController.php` - Passes vendor ID to service
5. `app/Services/DashboardService.php` - Filters all statistics by vendor
6. `app/Http/Controllers/VendorController.php` - Creates user accounts for vendors
7. `app/Models/Vendor.php` - Added `user_id` and `user()` relationship

### Frontend Changes

**Files Modified:**
1. `resources/js/layouts/MainLayout.jsx` - Hides menu items from vendors
2. `resources/js/pages/Vendors/VendorList.jsx` - Added password fields

### Migration Files

1. `database/migrations/2026_02_21_180531_add_user_id_to_vendors_table.php`

## Role Slug

The system checks for the vendor role using:
```php
$user->role->slug === 'vendor'
```

Make sure your roles table has a record with:
- `slug`: `vendor`
- `name`: `Vendor` (or any display name)

## Security Features

1. **Automatic Filtering:** All queries are automatically filtered by vendor ID
2. **No Direct Access:** Vendors cannot access other vendors' data even with direct API calls
3. **Menu Restrictions:** Vendors cannot see admin-only pages in the UI
4. **Role-Based Authorization:** Backend validates role before showing data

## Testing the Vendor Role

### As Admin:
1. Login as admin
2. Create a new vendor with login credentials
3. Note the email and password

### As Vendor:
1. Logout
2. Login with vendor credentials
3. Verify you see:
   - ✅ Only your own orders
   - ✅ Only assigned products in marketplace
   - ✅ Only Shopify integration
   - ✅ Dashboard with your statistics
   - ❌ No access to Products, Stock, Expenses, or User Management

## Future Enhancements

Potential features to add:
- Vendor can update their own profile
- Vendor can request new products to be added to marketplace
- Vendor-specific reports and analytics
- Commission tracking dashboard for vendors
- Vendor notifications for new orders
- Vendor can manage their own Shopify webhooks

## Troubleshooting

**Issue:** Vendor sees all orders instead of only their own
- **Solution:** Check that `vendor_id` is set correctly on orders
- **Check:** Verify the vendor record has a `user_id` linking to the user account

**Issue:** Vendor cannot login
- **Solution:** Verify user account was created with role `vendor`
- **Check:** Run `SELECT * FROM users WHERE email = 'vendor@email.com'`

**Issue:** Vendor sees admin menu items
- **Solution:** Clear browser cache and rebuild frontend: `npm run build`
- **Check:** Verify `user.role.slug` returns `'vendor'` in frontend

## Summary

The vendor role system provides complete isolation of vendor data while using the same application. Each vendor can:

1. **Login** with their own credentials
2. **View** only their own dashboard, orders, and products
3. **Connect** their Shopify store
4. **Manage** orders assigned to them
5. **Access** a simplified, focused interface

All data is automatically filtered by the backend, ensuring security and data isolation.

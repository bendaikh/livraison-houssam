# ⚡ IMMEDIATE FIX - "Missing Shopify credentials"

## The Problem
Your Shopify integration (ID: 1) exists but has **no credentials** saved in the database, or they're saved incorrectly.

## Fix It NOW (3 Minutes)

### Option 1: Fix via Web Interface (EASIEST) ✅

1. **Go to API Integrations page**
   - URL: `https://smanager.site/api-integrations`

2. **Find your Shopify integration**
   - Should say "Shopify Store" or similar

3. **Click "Edit" button**

4. **Fill in BOTH fields:**
   
   **Shop URL:**
   - Format: `yourstore.myshopify.com`
   - Example: If your Shopify URL is `https://myshop.myshopify.com/admin`, enter: `myshop.myshopify.com`
   - ❌ DON'T include `https://`
   - ❌ DON'T include `/admin`
   - ✅ JUST: `yourstore.myshopify.com`

   **Admin API Access Token:**
   - Long string starting with `shpat_` or `shpca_` or `shpss_`
   - Get it from Shopify: **Settings → Apps → Develop apps → API credentials → Admin API access token**

5. **Check "Enable this integration"** (checkbox)

6. **Click "Update Integration"**

7. **Click "Test Connection"**
   - Should show "Connection successful"
   - If it fails, double-check your Shop URL and Access Token

8. **Go back to Orders page**

9. **Click "Sync Shopify Orders"**
   - Should work now!

### Option 2: Fix via Command Line (ADVANCED)

On your production server:

```bash
cd /path/to/your/project

# Check what's wrong
php artisan shopify:check

# This will show you:
# - If credentials are missing
# - If they're in wrong format
# - What needs to be fixed

# To auto-fix structure issues:
php artisan shopify:check --fix

# Then manually set your credentials via web interface
```

### Option 3: Fix via Database (IF YOU KNOW WHAT YOU'RE DOING)

```bash
# Connect to your database
mysql -u your_user -p your_database

# Check current credentials
SELECT id, name, credentials FROM api_integrations WHERE type = 'shopify';

# If credentials is NULL or empty, update it:
UPDATE api_integrations 
SET credentials = JSON_OBJECT(
    'shop_url', 'yourstore.myshopify.com',
    'access_token', 'shpat_your_actual_token_here'
)
WHERE id = 1 AND type = 'shopify';

# Verify it worked:
SELECT id, name, credentials FROM api_integrations WHERE id = 1;
```

## How to Get Your Shopify Credentials

### Shop URL:
1. Log into Shopify Admin
2. Look at the URL in browser
3. Example: `https://admin.shopify.com/store/mystore123`
4. Your shop URL is: `mystore123.myshopify.com`

OR:

1. In Shopify Admin, go to **Settings** → **General**
2. Under "Store details", you'll see your store domain

### Access Token:
1. Go to Shopify Admin
2. Click **Settings** (bottom left)
3. Click **Apps and sales channels**
4. Click **Develop apps** (might need to enable it first)
5. Click your app (or create new one)
6. Go to **API credentials** tab
7. Under **Admin API access token**, click **Reveal token once**
8. Copy the token (looks like: `shpat_abc123def456...`)
9. Paste it in your integration settings

**Required Permissions:**
- ✅ `read_orders` (MUST HAVE)
- ✅ `read_products` (recommended)
- ✅ `read_customers` (recommended)

## Verify It's Fixed

1. **Test Connection**:
   - API Integrations page → Click "Test Connection"
   - Should show: "Connection successful"

2. **Check Integration Details**:
   - Open in browser: `https://smanager.site/api/api-integrations/1/details`
   - Should show:
     ```json
     {
       "credentials_present": {
         "shop_url": true,
         "access_token": true,
         "shop_url_value": "yourstore.myshopify.com"
       }
     }
     ```

3. **Try Sync**:
   - Orders page → Click "Sync Shopify Orders"
   - Should show success message with number of orders imported

## Common Mistakes

❌ **Shop URL includes https://**
- Wrong: `https://mystore.myshopify.com`
- Right: `mystore.myshopify.com`

❌ **Shop URL includes /admin**
- Wrong: `mystore.myshopify.com/admin`
- Right: `mystore.myshopify.com`

❌ **Using custom domain**
- Wrong: `mystore.com`
- Right: `mystore.myshopify.com`

❌ **Access token missing or wrong**
- Make sure you copied the FULL token
- Should be 50+ characters
- Should start with `shpat_`, `shpca_`, or `shpss_`

❌ **Integration not active**
- Make sure checkbox is checked
- Status should show "Active" (green)

## Still Getting Error?

Run this command on server:
```bash
php artisan shopify:check
```

Look for:
- ❌ marks = problems
- ✅ marks = working
- Follow the instructions it gives you

## Screenshot What to Check

When editing integration, you should see:
```
┌─────────────────────────────────────┐
│ Integration Name                    │
│ [Shopify Store              ]       │
│                                     │
│ Shop URL                            │
│ [mystore.myshopify.com      ]       │
│ Your Shopify store URL              │
│                                     │
│ Admin API Access Token              │
│ [shpat_••••••••••••••••••••]       │
│ Get from Shopify Admin → Apps       │
│                                     │
│ ☑ Enable this integration          │
│                                     │
│ [Update Integration] [Cancel]       │
└─────────────────────────────────────┘
```

## Quick Checklist

Before clicking "Sync Shopify Orders":
- [ ] Integration ID 1 exists
- [ ] Integration is Active (green badge)
- [ ] Shop URL is filled: `yourstore.myshopify.com`
- [ ] Access Token is filled (50+ chars)
- [ ] Test Connection shows "Success"
- [ ] Refresh browser (Ctrl+Shift+R)
- [ ] Try sync

---

**TL;DR:**
1. Go to API Integrations page
2. Edit Shopify integration
3. Enter Shop URL: `yourstore.myshopify.com`
4. Enter Access Token from Shopify
5. Check "Enable" checkbox
6. Click Update
7. Click Test Connection
8. Go to Orders → Sync

**The error "Missing Shopify credentials" means the `shop_url` and/or `access_token` fields are empty in your integration settings. Just fill them in!** 🎯

---

**Created:** February 21, 2026
**Issue:** Missing Shopify credentials in database
**Fix Time:** 3 minutes

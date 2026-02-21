# 🔧 Shopify Sync Error - Troubleshooting Guide

## You're Getting This Error:
> "Failed to sync Shopify orders. Please check your integration settings."

## Quick Fix Steps (Try These First)

### Step 1: Run the Troubleshooting Script
On your production server, run:
```bash
cd /path/to/your/project
php troubleshoot_shopify.php
```

This script will:
- ✅ Check if Shopify integration exists
- ✅ Verify credentials are configured
- ✅ Test connection to Shopify API
- ✅ Show detailed error messages
- ✅ Check database for existing orders

### Step 2: Check Browser Console
1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Click "Sync Shopify Orders" again
4. Look for error messages
5. Screenshot and check what it says

### Step 3: Check Your Shopify Integration Settings

Go to **API Integrations** page and verify:

1. **Integration is Active** (green toggle)
2. **Shop URL Format**:
   - ✅ Correct: `yourstore.myshopify.com`
   - ❌ Wrong: `https://yourstore.myshopify.com/admin`
   - ❌ Wrong: `yourstore.com`

3. **Access Token**:
   - Should be a long string (starts with `shpat_`, `shpca_`, or `shpss_`)
   - Must have `read_orders` permission
   - Not expired

## Common Issues & Solutions

### Issue 1: Missing or Invalid Credentials
**Error Messages:**
- "Shopify shop URL is not configured"
- "Shopify access token is not configured"
- "Invalid shop URL format"

**Solution:**
1. Go to **API Integrations**
2. Edit your Shopify integration
3. Make sure both fields are filled:
   - **Shop URL**: `yourstore.myshopify.com` (replace "yourstore" with your actual store name)
   - **Access Token**: Your Shopify Admin API token
4. Click **Save**
5. Try sync again

### Issue 2: Invalid Access Token
**Error Messages:**
- "Failed to fetch orders from Shopify (Status: 401)"
- "Unauthorized"
- "Invalid API key or access token"

**Solution:**
1. Go to your **Shopify Admin Panel**
2. Navigate to: **Settings** → **Apps and sales channels** → **Develop apps**
3. Click on your app
4. Go to **API credentials** tab
5. Copy the **Admin API access token**
6. Paste it in your integration settings
7. Make sure the app has these permissions:
   - ✅ `read_orders`
   - ✅ `read_products` (optional but recommended)
   - ✅ `read_customers` (optional but recommended)

### Issue 3: Wrong Shop URL Format
**Error Messages:**
- "Invalid shop URL format"
- "Failed to fetch orders"

**Solution:**
Use **ONLY** your `.myshopify.com` domain:
- ✅ `yourstore.myshopify.com`
- ❌ NOT `https://yourstore.myshopify.com`
- ❌ NOT `yourstore.myshopify.com/admin`
- ❌ NOT your custom domain

### Issue 4: Network/Firewall Issues
**Error Messages:**
- "Connection timeout"
- "Could not resolve host"
- "SSL certificate problem"

**Solution:**
1. Check if your server can reach Shopify:
   ```bash
   curl -I https://yourstore.myshopify.com
   ```
2. Check firewall rules allow outbound HTTPS (port 443)
3. Verify SSL certificates are up to date
4. Contact your hosting provider if needed

### Issue 5: No Orders in Shopify
**Error Messages:**
- "Sync completed! 0 orders imported successfully."

**This is normal if:**
- Your Shopify store has no orders yet
- All orders were already synced previously
- Orders are older than last sync date

**To verify:**
1. Log into Shopify Admin
2. Go to **Orders**
3. Check if you have any orders
4. If yes, but sync shows 0, the orders might already be imported

## Detailed Debugging

### Check Laravel Logs
On your server:
```bash
tail -f storage/logs/laravel.log
```

Then click "Sync Shopify Orders" and watch for errors.

### Check Integration Details via API
Open this URL in your browser (replace with your actual domain):
```
https://yourdomain.com/api/api-integrations/{integration_id}/details
```

Look for:
- `is_active: true`
- `credentials_present.shop_url: true`
- `credentials_present.access_token: true`
- `shop_url_value`: Should show your shop URL

### Test Connection Button
1. Go to **API Integrations** page
2. Find your Shopify integration
3. Click **"Test Connection"** button
4. Should show "Connection successful"
5. If it fails, note the error message

## Getting More Detailed Errors

I've updated the code to show you the actual error message. Now when you click sync, you'll see:
- The specific error from Shopify
- Not just generic "Failed to sync"

**Try syncing again** and the error message will tell you exactly what's wrong!

## Manual Testing via Browser Console

Open browser console (F12) and run:

```javascript
// Get integration ID from API Integrations page
const integrationId = 1; // Replace with your actual ID

// Test sync
fetch('/api/api-integrations/' + integrationId + '/sync', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer YOUR_TOKEN',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
})
.then(res => res.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
```

## Still Not Working?

### Collect This Information:

1. **Error Message** (from alert popup)
2. **Browser Console Error** (F12 → Console tab)
3. **Laravel Log** (last 50 lines from `storage/logs/laravel.log`)
4. **Troubleshoot Script Output** (`php troubleshoot_shopify.php`)
5. **Integration Details**:
   - Shop URL (e.g., `mystore.myshopify.com`)
   - Is integration active? (Yes/No)
   - Can you access Shopify admin? (Yes/No)

### Where Your Shopify Access Token Should Be:

1. Log into **Shopify Admin**
2. Go to **Settings** (bottom left)
3. Click **Apps and sales channels**
4. Click **Develop apps** (or **Develop apps for your store**)
5. Click on your app (or create one)
6. Go to **API credentials** tab
7. Under **Admin API access token**, click **Reveal token once**
8. Copy the token (starts with `shpat_` or similar)
9. Paste in your integration settings

## Quick Checklist

Before syncing, verify:
- [ ] Shopify integration exists
- [ ] Integration is marked as Active (green toggle)
- [ ] Shop URL is in format: `storename.myshopify.com`
- [ ] Access token is filled and not expired
- [ ] Access token has `read_orders` permission
- [ ] Test Connection button shows success
- [ ] Your Shopify store has orders
- [ ] Your server can reach Shopify (no firewall blocks)

## Next Steps

1. **Try the new error messages**: Click sync again - you'll see the actual error
2. **Run troubleshoot script**: `php troubleshoot_shopify.php`
3. **Check browser console**: F12 → Console tab
4. **Fix based on error**: Use solutions above
5. **Test connection**: Use "Test Connection" button first

The error message you get now will tell you **exactly** what's wrong! 🎯

---

**Updated:** February 21, 2026
**Includes:** Enhanced error messages, troubleshooting script, detailed logging

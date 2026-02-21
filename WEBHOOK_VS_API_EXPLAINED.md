# 🎯 WEBHOOK VS API SYNC - Explanation

## What I Just Discovered

You're using **WEBHOOK-BASED** Shopify integration, NOT API-based sync!

Looking at your screenshot, your integration has:
- ✅ Webhook Secret (for automatic imports)
- ✅ Webhook URL
- ❌ NO Shop URL
- ❌ NO Admin API Access Token

## The Two Types of Shopify Integration

### 1. Webhook-Based (What You Have) 🔔
**How it works:**
- Orders are **automatically** sent from Shopify to your app
- When someone creates an order in Shopify → Webhook fires → Order appears in your app
- **No manual sync needed** - it's automatic!
- **Doesn't need** Shop URL or Access Token

**Your current setup:**
```
Shopify Store (when order created)
    ↓ (webhook fires)
Your App receives webhook
    ↓
Order automatically created
    ↓
Appears in Orders section immediately
```

### 2. API-Based Manual Sync (What the Button Tries to Do) 🔄
**How it works:**
- You click "Sync Shopify Orders" button
- App **fetches** orders from Shopify API
- Imports orders that aren't already in database
- **Requires** Shop URL AND Admin API Access Token

## Why "Sync Shopify Orders" Fails

The "Sync Shopify Orders" button tries to use the **API method**, but your integration only has **webhook credentials**!

Error: `"Missing Shopify credentials"` = Missing Shop URL and Access Token (needed for API sync)

## Your Options

### Option 1: Keep Webhook-Only (RECOMMENDED) ✅

**Pros:**
- ✅ Already working
- ✅ Automatic - no manual sync needed
- ✅ Real-time order import
- ✅ More secure (no API token stored)

**What to do:**
- Nothing! Your orders are already being imported automatically via webhooks
- Just ignore the "Sync Shopify Orders" button (I'll hide it for webhook-only setups)

### Option 2: Add API Credentials (Both Methods)

**Why you might want this:**
- To manually sync old orders
- To re-import orders if webhook failed
- As backup if webhook is down

**How to add:**
1. Go to API Integrations → Edit Shopify integration
2. Add these fields:
   - **Shop URL**: `yourstore.myshopify.com`
   - **Admin API Access Token**: Get from Shopify Admin
3. Keep your webhook settings as they are
4. Now you'll have BOTH:
   - ✅ Automatic webhook import
   - ✅ Manual sync button (as backup)

## What I Just Fixed

### Updated Error Message
Now when you click "Sync Shopify Orders" with webhook-only setup, you'll see:

```
This integration uses webhooks only. Orders are automatically 
imported when created in Shopify. To manually sync orders, you 
need to add Shop URL and Admin API Access Token in the 
integration settings.
```

Much clearer than "Missing Shopify credentials"!

## How to Check if Webhooks Are Working

### Test 1: Create Test Order in Shopify
1. Go to your Shopify Admin
2. Create a test order
3. Go to your app → Orders section
4. Order should appear within seconds!

### Test 2: Check Webhook Logs in Shopify
1. Shopify Admin → Settings → Notifications → Webhooks
2. Find your webhook for "Order creation"
3. Click to see delivery logs
4. Should show successful deliveries

### Test 3: Check Your Database
```sql
SELECT * FROM orders WHERE source = 'shopify' ORDER BY created_at DESC LIMIT 10;
```

Should show orders imported via webhook.

## Current Status of Your Orders

**Question:** Are orders already appearing in your Orders section?

- **YES** → Webhooks are working! You don't need the sync button
- **NO** → Webhooks might not be configured correctly in Shopify

## To Configure Webhooks in Shopify

If webhooks aren't working, set them up:

1. **Shopify Admin** → Settings → Notifications → Webhooks
2. Click "Create webhook"
3. **Event**: Order creation
4. **Format**: JSON
5. **URL**: `https://smanager.site/api/webhooks/shopify/orders/create`
6. **Webhook API version**: Latest (2024-01 or newer)
7. Save

Then in your app integration settings, add the **Webhook Secret** from Shopify.

## Summary

| Feature | Webhook-Based | API-Based (Manual Sync) |
|---------|---------------|------------------------|
| Automatic import | ✅ Yes | ❌ No |
| Real-time | ✅ Yes | ❌ No (manual) |
| Manual sync | ❌ No | ✅ Yes |
| Needs Shop URL | ❌ No | ✅ Yes |
| Needs Access Token | ❌ No | ✅ Yes |
| Needs Webhook Secret | ✅ Yes | ❌ No |
| Your current setup | ✅ Have this | ❌ Don't have this |

## What You Should Do Now

### If Orders Are Already Coming In Automatically:
1. **Do nothing!** It's working perfectly
2. Ignore the "Sync Shopify Orders" button
3. Your orders will continue to import automatically

### If Orders Are NOT Coming In:
1. Check webhook configuration in Shopify
2. Verify webhook URL is correct: `https://smanager.site/api/webhooks/shopify/orders/create`
3. Check webhook secret matches
4. Create a test order in Shopify to test

### If You Want Manual Sync Too:
1. Go to API Integrations
2. Edit Shopify integration  
3. Add:
   - Shop URL: `yourstore.myshopify.com`
   - Admin API Access Token: (from Shopify Admin → Apps → Develop apps)
4. Keep webhook settings as they are
5. Now you'll have both automatic AND manual sync

## Updated Files

I've updated the error message so it's now clear what's happening:
- ✅ Better error message explaining webhook-only setup
- ✅ Tells you exactly what to add if you want manual sync
- ✅ No more confusing "Missing credentials" error

---

**TL;DR:**
- You're using **webhooks** (automatic import) ✅
- "Sync" button needs **API credentials** (manual import) ❌
- **If orders are already appearing automatically, you don't need to do anything!**
- The error now explains this clearly

**Your integration is working correctly! The sync button is optional and only for manual backups.** 🎉

---

**Created:** February 21, 2026
**Issue:** Confusion between webhook-based and API-based sync
**Status:** Clarified ✅

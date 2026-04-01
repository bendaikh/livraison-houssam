# Automatic Order Status Sync - Setup Guide

## What You Want

✅ **Automatic status sync** - No more clicking "Sync Status" button!

✅ **Background updates** - Statuses update automatically without manual intervention

## The Solution

Your system already has **automatic background sync** configured! It's set to run **every 30 minutes** and will automatically update all active orders.

Just need to enable it on your server.

## How It Works

```
Every 30 minutes:
├── System finds all orders with status "confirmed" or "shipped"
├── For each order:
│   ├── Calls BMDelivery API
│   ├── Gets latest status
│   ├── Updates delivery_status
│   └── Updates order status (e.g., "Injoignable" → "cancelled")
└── Done! All orders are now up-to-date
```

**No manual clicking needed!** ✨

## Setup Instructions

### Windows Server (Task Scheduler)

**Step 1: Open Task Scheduler**
1. Press `Win + R`
2. Type `taskschd.msc`
3. Press Enter

**Step 2: Create New Task**
1. Click "Create Task" (not "Create Basic Task")
2. Name: `Laravel Scheduler`
3. Description: `Runs Laravel scheduled tasks including order status sync`
4. Check "Run whether user is logged on or not"
5. Check "Run with highest privileges"

**Step 3: Triggers Tab**
1. Click "New..."
2. Begin the task: "On a schedule"
3. Settings: "Daily"
4. Repeat task every: **1 minute**
5. Duration: "Indefinitely"
6. Click OK

**Step 4: Actions Tab**
1. Click "New..."
2. Action: "Start a program"
3. Program/script: `C:\php\php.exe` (adjust to your PHP path)
4. Add arguments: `artisan schedule:run`
5. Start in: `C:\path\to\your\project` (your project folder)
6. Click OK

**Step 5: Conditions Tab**
1. **Uncheck** "Start the task only if the computer is on AC power"
2. **Uncheck** "Stop if the computer switches to battery power"

**Step 6: Settings Tab**
1. Check "Allow task to be run on demand"
2. Check "Run task as soon as possible after a scheduled start is missed"
3. If task fails, restart every: "1 minute"
4. Attempt to restart up to: "3 times"

**Step 7: Save**
1. Click OK
2. Enter your Windows password if prompted
3. Done!

### Linux/Ubuntu Server (Crontab)

**Step 1: Edit Crontab**
```bash
crontab -e
```

**Step 2: Add This Line**
```bash
* * * * * cd /path/to/your/project && php artisan schedule:run >> /dev/null 2>&1
```

Replace `/path/to/your/project` with your actual project path, for example:
```bash
* * * * * cd /var/www/livraison-houssam && php artisan schedule:run >> /dev/null 2>&1
```

**Step 3: Save and Exit**
- Press `Ctrl + X`
- Press `Y`
- Press `Enter`

**Step 4: Verify**
```bash
crontab -l
```
Should show your cron job.

### Testing the Scheduler

**Check if it's running:**
```bash
php artisan schedule:list
```

You should see:
```
0 */30 * * *  orders:sync-delivery-statuses .......... Next Due: 15 minutes from now
```

**Run manually to test:**
```bash
php artisan orders:sync-delivery-statuses
```

Expected output:
```
Starting delivery status synchronization...
Found 10 order(s) to sync.
Syncing order #ORD-20260227-8104 (ID: 224)...
  Delivery status changed: Expédié → Injoignable
  Order status updated: shipped → cancelled
Synchronization complete!
  Successful: 10
  Failed: 0
  Status Changed: 3
```

## How Often Does It Sync?

**Default: Every 30 minutes**

You can change this in `routes/console.php`:

```php
// Every 30 minutes (default)
Schedule::command('orders:sync-delivery-statuses')->everyThirtyMinutes();

// Or change to:

// Every 15 minutes (more frequent)
Schedule::command('orders:sync-delivery-statuses')->everyFifteenMinutes();

// Every hour (less frequent)
Schedule::command('orders:sync-delivery-statuses')->hourly();

// Every 10 minutes (very frequent)
Schedule::command('orders:sync-delivery-statuses')->everyTenMinutes();

// Every 5 minutes (most frequent)
Schedule::command('orders:sync-delivery-statuses')->everyFiveMinutes();
```

## What Orders Are Synced?

The sync only checks orders that:
- ✅ Have a tracking code
- ✅ Are assigned to a delivery company
- ✅ Have status "confirmed" OR "shipped" (active orders)

Skips orders that are:
- ❌ Already delivered
- ❌ Already cancelled
- ❌ Don't have tracking code

## Monitoring the Sync

### Check Logs

```bash
# View latest sync activity
tail -f storage/logs/laravel.log | grep "delivery status"
```

You'll see logs like:
```
[2026-02-28 16:00:00] production.INFO: Order delivery status synced from BMDelivery
{"order_id":224,"order_number":"ORD-20260227-8104","old_status":"shipped","new_status":"cancelled"}
```

### Check Last Run Time

```bash
php artisan schedule:list
```

Shows when each scheduled task last ran and when it's due next.

## Real-World Example

### Before Enabling Scheduler

```
10:00 AM - BMDelivery: Order status changed to "Injoignable"
10:05 AM - Your App: Still shows "shipped"
10:10 AM - Your App: Still shows "shipped"
...
11:00 AM - User clicks "Sync Status"
11:00 AM - Your App: Finally updates to "cancelled"
```

**Problem:** Manual click required, delay in updates

### After Enabling Scheduler

```
10:00 AM - BMDelivery: Order status changed to "Injoignable"
10:05 AM - Your App: Still shows "shipped"
10:10 AM - Your App: Still shows "shipped"
...
10:30 AM - SCHEDULER RUNS AUTOMATICALLY
10:30 AM - Your App: Updates to "cancelled" ✅
...
11:00 AM - SCHEDULER RUNS AGAIN
11:00 AM - Checks all orders, updates any changes ✅
```

**Solution:** Automatic updates every 30 minutes!

## Bonus: Enable Webhooks for Real-Time Updates

For **instant updates** instead of waiting 30 minutes, you can enable webhooks:

### Setup BMDelivery Webhook

1. Log into BMDelivery dashboard
2. Go to API Settings / Webhooks
3. Add webhook URL:
   ```
   https://yourdomain.com/api/webhooks/bmdelivery/status-update
   ```
4. Save

Now updates happen **instantly** when BMDelivery changes status! ⚡

**How it works:**
```
BMDelivery changes status → Sends webhook → Your app updates immediately (< 1 second)
```

Instead of:
```
BMDelivery changes status → Wait up to 30 minutes → Scheduler syncs
```

## Verification Checklist

After setup, verify:

- [ ] Scheduler is running (check Task Scheduler/crontab)
- [ ] Command runs successfully: `php artisan orders:sync-delivery-statuses`
- [ ] Logs show sync activity in `storage/logs/laravel.log`
- [ ] Orders update automatically (check after 30 minutes)
- [ ] No errors in logs

## Troubleshooting

### Scheduler Not Running

**Windows:**
- Check Task Scheduler → Laravel Scheduler task
- Make sure it's "Running" status
- Check "Last Run Time" column

**Linux:**
- Check crontab: `crontab -l`
- Check cron logs: `grep CRON /var/log/syslog`

### Orders Not Updating

1. **Check if orders qualify for sync:**
   ```bash
   # Count orders that will be synced
   php artisan tinker
   >>> Order::whereNotNull('delivery_tracking_code')->whereNotNull('delivery_integration_id')->whereIn('status', ['confirmed', 'shipped'])->count()
   ```

2. **Run sync manually and check output:**
   ```bash
   php artisan orders:sync-delivery-statuses
   ```

3. **Check logs:**
   ```bash
   tail -100 storage/logs/laravel.log
   ```

### API Token Issues

If sync fails with "API token not configured":

1. Check BMDelivery integration has valid API token
2. Go to API Integrations page
3. Test connection
4. Save API token again if needed

## Summary

**Before:** Click "Sync Status" button manually for each order ❌

**After:** Automatic sync every 30 minutes for all orders ✅

**Setup Time:** 5 minutes

**Result:** Hands-free automatic order status updates! 🎉

---

**Quick Start Commands:**

```bash
# Windows (PowerShell as Admin)
# Follow Task Scheduler steps above

# Linux
crontab -e
# Add: * * * * * cd /path/to/project && php artisan schedule:run >> /dev/null 2>&1

# Test
php artisan schedule:list
php artisan orders:sync-delivery-statuses
```

**That's it!** Your orders will now sync automatically every 30 minutes! 🚀

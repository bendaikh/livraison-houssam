# Hostinger - Setup Automatic Status Sync

## Step-by-Step Guide for Hostinger

### Step 1: Access Hostinger Control Panel (hPanel)

1. Log into your Hostinger account
2. Go to your hosting dashboard
3. Find your domain/website
4. Click "Manage" or open hPanel

### Step 2: Find Cron Jobs

1. In hPanel, look for **"Advanced"** section
2. Click on **"Cron Jobs"**
   - It might also be under "Tools" → "Cron Jobs"

### Step 3: Create New Cron Job

**Common Settings:**
- **Minute:** `*` (every minute)
- **Hour:** `*` (every hour)
- **Day:** `*` (every day)
- **Month:** `*` (every month)
- **Weekday:** `*` (every weekday)

**Or use the dropdown:** Select **"Every Minute"**

**Command to run:**
```bash
cd /home/your_username/domains/yourdomain.com/public_html && php artisan schedule:run >> /dev/null 2>&1
```

**Important:** Replace:
- `your_username` with your Hostinger username
- `yourdomain.com` with your actual domain

### Step 4: Find Your Project Path

Not sure of your exact path? SSH into Hostinger and run:
```bash
pwd
```

Common Hostinger paths:
- `/home/u123456789/domains/yourdomain.com/public_html`
- `/home/username/domains/yourdomain.com/public_html`
- `/home/username/public_html`

### Visual Guide for Hostinger

```
┌─────────────────────────────────────────────────┐
│          Hostinger hPanel - Cron Jobs           │
├─────────────────────────────────────────────────┤
│                                                 │
│  Add New Cron Job                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                 │
│  Frequency:  [Every Minute ▼]                   │
│                                                 │
│  Or Custom:                                     │
│  Minute:   [*]  Hour:   [*]  Day:    [*]        │
│  Month:    [*]  Weekday: [*]                    │
│                                                 │
│  Command:                                       │
│  ┌───────────────────────────────────────────┐ │
│  │ cd /home/u123456789/domains/              │ │
│  │ yourdomain.com/public_html &&             │ │
│  │ php artisan schedule:run >> /dev/null 2>&1│ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [Cancel]              [Add Cron Job]           │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Step 5: Save the Cron Job

1. Click "Add Cron Job" or "Create"
2. You should see confirmation: "Cron job created successfully"

### Step 6: Verify It's Working

**Option 1: Check via SSH (if you have SSH access)**
```bash
# SSH into Hostinger
ssh your_username@yourdomain.com

# Go to project folder
cd domains/yourdomain.com/public_html

# Check if scheduler is configured
php artisan schedule:list

# Run sync manually to test
php artisan orders:sync-delivery-statuses
```

**Option 2: Check Logs**

After 30-60 minutes, check if it's working:

1. Go to File Manager in hPanel
2. Navigate to: `storage/logs/laravel.log`
3. Look for entries like:
   ```
   [2026-02-28] production.INFO: Starting delivery status synchronization
   [2026-02-28] production.INFO: Order delivery status synced from BMDelivery
   ```

### Complete Example for Hostinger

**If your project is at:**
```
/home/u123456789/domains/example.com/public_html
```

**Your cron command should be:**
```bash
cd /home/u123456789/domains/example.com/public_html && php artisan schedule:run >> /dev/null 2>&1
```

**Cron Schedule:**
```
* * * * *
```
(This means: every minute)

### Common Hostinger Paths

Replace `{username}` and `{domain}` with yours:

```bash
# Standard shared hosting
/home/{username}/domains/{domain}/public_html

# Example 1
/home/u123456789/domains/myshop.com/public_html

# Example 2
/home/john_doe/domains/livraison.ma/public_html

# Example 3 (if Laravel is in subdirectory)
/home/username/domains/domain.com/public_html/laravel
```

### Finding Your PHP Path (if needed)

Some Hostinger servers might need full PHP path:

```bash
# SSH into Hostinger
which php
```

Might return: `/usr/local/bin/php` or `/opt/alt/php81/usr/bin/php`

Then use:
```bash
cd /home/username/domains/domain.com/public_html && /usr/local/bin/php artisan schedule:run >> /dev/null 2>&1
```

### What Happens After Setup

```
Every minute:
├── Cron job runs: php artisan schedule:run
├── Laravel checks: "Is it time to run sync?" (every 30 min)
│   ├── If NO: Do nothing, exit
│   └── If YES: Run orders:sync-delivery-statuses
│       ├── Find active orders
│       ├── Sync with BMDelivery
│       ├── Update statuses
│       └── Log results
└── Done!
```

**Result:** Your orders sync automatically every 30 minutes! ✨

### Troubleshooting

#### Cron job not running?

1. **Check if cron is active:**
   - In hPanel → Cron Jobs
   - Should show "Active" or "Enabled"

2. **Check PHP path is correct:**
   ```bash
   # SSH into Hostinger
   which php
   php -v
   ```

3. **Check project path:**
   ```bash
   ls -la /home/username/domains/domain.com/public_html/artisan
   ```
   Should show the artisan file exists.

4. **Check logs:**
   ```bash
   tail -50 storage/logs/laravel.log
   ```

#### Permission issues?

```bash
# Fix permissions
cd /home/username/domains/domain.com/public_html
chmod -R 755 storage bootstrap/cache
chown -R username:username storage bootstrap/cache
```

#### Command not found?

Try with full PHP path:
```bash
cd /home/username/domains/domain.com && /opt/alt/php81/usr/bin/php artisan schedule:run
```

### Hostinger-Specific Notes

1. **Email notifications:** Hostinger might send you emails every time cron runs. To disable:
   ```bash
   cd /path && php artisan schedule:run > /dev/null 2>&1
   ```
   (Already included in our command)

2. **PHP version:** Make sure using PHP 8.1 or higher
   - Check in hPanel → PHP Configuration

3. **Memory limit:** If sync fails, increase in `.user.ini`:
   ```ini
   memory_limit = 256M
   max_execution_time = 300
   ```

### Quick Setup Checklist for Hostinger

- [ ] Log into Hostinger hPanel
- [ ] Go to Advanced → Cron Jobs
- [ ] Click "Add New Cron Job"
- [ ] Set to "Every Minute" (or `* * * * *`)
- [ ] Add command: `cd /home/username/domains/domain.com/public_html && php artisan schedule:run >> /dev/null 2>&1`
- [ ] Replace `username` and `domain.com` with your actual values
- [ ] Click "Create" or "Add"
- [ ] Wait 30-60 minutes
- [ ] Check `storage/logs/laravel.log` for sync activity

### Alternative: Hostinger Business/Premium Plan

If you have Business or Premium plan with SSH access:

```bash
# SSH into Hostinger
ssh username@yourdomain.com

# Edit crontab directly
crontab -e

# Add this line
* * * * * cd /home/username/domains/domain.com/public_html && php artisan schedule:run >> /dev/null 2>&1

# Save and exit
# Ctrl+X, then Y, then Enter

# Verify
crontab -l
```

### Testing Your Setup

**Test 1: Run manually via SSH**
```bash
cd /home/username/domains/domain.com/public_html
php artisan orders:sync-delivery-statuses
```

Expected output:
```
Starting delivery status synchronization...
Found 5 order(s) to sync.
Syncing order #ORD-20260227-8104...
  ✓ Status updated
Synchronization complete!
```

**Test 2: Wait 30 minutes and check**
1. Note current time
2. Wait 30-35 minutes
3. Check logs: `storage/logs/laravel.log`
4. Should see new sync entries

### Verification

After 1 hour, you should see in logs:
```
[2026-02-28 14:00:01] production.INFO: Starting delivery status synchronization
[2026-02-28 14:00:05] production.INFO: Synchronization complete! Successful: 10, Failed: 0
[2026-02-28 14:30:01] production.INFO: Starting delivery status synchronization
[2026-02-28 14:30:04] production.INFO: Synchronization complete! Successful: 10, Failed: 0
```

### Summary for Hostinger

**What you need:**
1. ✅ Hostinger hPanel access
2. ✅ Your project path
3. ✅ 2 minutes to add cron job

**The command:**
```bash
cd /home/your_username/domains/yourdomain.com/public_html && php artisan schedule:run >> /dev/null 2>&1
```

**Schedule:**
```
Every minute: * * * * *
```

**Result:**
- ✅ Orders sync automatically every 30 minutes
- ✅ No more manual clicking
- ✅ Statuses update in background

---

**Need Help Finding Your Path?**

SSH into Hostinger and run:
```bash
pwd
echo "Your Laravel path is: $(pwd)"
ls -la artisan  # Verify artisan file exists
```

Then use that path in the cron command!

🎉 **After setup, your orders will sync automatically!**

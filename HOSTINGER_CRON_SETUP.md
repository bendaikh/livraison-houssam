# Hostinger - Automatic Google Sheet import

## Why Sync all worked but auto did not

Hostinger disables `proc_open`, so Laravel `Schedule::command()` failed silently.
That is fixed (tasks now run in-process).

If **Dernière sync** still does not move every minute, Hostinger is not executing
`schedule:run` reliably. Use the **dedicated** Google Sheet cron below.

## Recommended cron (add this in hPanel)

**Frequency:** Every Minute  

**Command:**

```bash
/usr/bin/php /home/u742965935/domains/alfa-cod.com/public_html/artisan google-sheet:sync >> /dev/null 2>&1
```

You can keep your existing `schedule:run` cron for delivery syncs, **and** add this
second cron only for Google Sheets.

## Existing schedule:run cron (optional to keep)

```bash
/usr/bin/php /home/u742965935/domains/alfa-cod.com/public_html/artisan schedule:run >> /dev/null 2>&1
```

## HTTP alternative

On the Google Sheets page, copy the Automatic import webhook URL and cron:

```bash
curl -s "https://alfa-cod.com/api/webhooks/google-sheet/sync?token=YOUR_TOKEN" > /dev/null
```

## How to verify

1. Add a new complete row to the connected sheet (name, phone, city/address, price).
2. Wait up to 1–2 minutes — do **not** click Sync.
3. Refresh the Google Sheets page: **Dernière sync** should update.
4. Check Orders — the new row should appear.

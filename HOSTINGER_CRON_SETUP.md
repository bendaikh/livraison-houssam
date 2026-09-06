# Hostinger - Automatic Google Sheet import & Delivery status sync

## Why Sync all worked but auto did not

Hostinger disables `proc_open`, so Laravel `Schedule::command()` failed silently.
That is fixed (tasks now run in-process via `Schedule::call()` + `Artisan::call()`).

If jobs still do not run, Hostinger is not executing `schedule:run` (user crontab is
often disabled). Use the **dedicated** crons below in **hPanel → Advanced → Cron Jobs**.

---

## 1) Google Sheet auto-import (every minute)

**Command:**

```bash
/usr/bin/php /home/u742965935/domains/alfa-cod.com/public_html/artisan google-sheet:sync >> /dev/null 2>&1
```

**HTTP alternative** (from the Google Sheets page — sync token is per integration):

```bash
curl -s "https://alfa-cod.com/api/webhooks/google-sheet/sync?token=YOUR_TOKEN" > /dev/null
```

---

## 2) Automatic delivery status sync (VadoMax + BMDelivery)

This replaces clicking **Synchroniser le statut** on each order.

Statuses are pulled from the delivery company API for all active orders
(not delivered / not cancelled) and update both `delivery_status` and order status.

### Recommended: dedicated PHP crons in hPanel

**VadoMax (Tawsilex) — every 5 minutes:**

```bash
/usr/bin/php /home/u742965935/domains/alfa-cod.com/public_html/artisan orders:sync-delivery-statuses --provider=tawsilex >> /home/u742965935/domains/alfa-cod.com/public_html/storage/logs/delivery-sync.log 2>&1
```

**BMDelivery — every 15 minutes:**

```bash
/usr/bin/php /home/u742965935/domains/alfa-cod.com/public_html/artisan orders:sync-delivery-statuses --provider=bmdelivery >> /home/u742965935/domains/alfa-cod.com/public_html/storage/logs/delivery-sync.log 2>&1
```

### HTTP alternative (if Hostinger only allows URL cron)

Token is `DELIVERY_STATUS_SYNC_TOKEN` in `.env`.

**Both providers:**

```bash
curl -s "https://alfa-cod.com/api/webhooks/delivery/sync-statuses?token=YOUR_DELIVERY_STATUS_SYNC_TOKEN" > /dev/null
```

**VadoMax only:**

```bash
curl -s "https://alfa-cod.com/api/webhooks/delivery/sync-statuses?token=YOUR_DELIVERY_STATUS_SYNC_TOKEN&provider=tawsilex" > /dev/null
```

**BMDelivery only:**

```bash
curl -s "https://alfa-cod.com/api/webhooks/delivery/sync-statuses?token=YOUR_DELIVERY_STATUS_SYNC_TOKEN&provider=bmdelivery" > /dev/null
```

---

## Optional: Laravel schedule:run (every minute)

Keeps all `routes/console.php` schedules (Google Sheet, delivery syncs, daily billings):

```bash
/usr/bin/php /home/u742965935/domains/alfa-cod.com/public_html/artisan schedule:run >> /home/u742965935/domains/alfa-cod.com/public_html/storage/logs/scheduler.log 2>&1
```

Prefer the **dedicated** delivery crons above if `schedule:run` is unreliable on Hostinger.

---

## How to verify delivery auto-sync

1. Add the VadoMax cron in hPanel (every 5 minutes).
2. Wait up to 5–6 minutes — do **not** click Synchroniser le statut.
3. Open an order that was in transit: delivery status should match VadoMax/BMDelivery.
4. Check log: `storage/logs/delivery-sync.log`

Manual one-shot test:

```bash
/usr/bin/php /home/u742965935/domains/alfa-cod.com/public_html/artisan orders:sync-delivery-statuses --provider=tawsilex
```

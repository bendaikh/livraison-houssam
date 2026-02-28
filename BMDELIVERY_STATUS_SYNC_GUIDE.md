# BMDelivery Order Status Synchronization Guide

## Overview

This system automatically syncs order statuses from BMDelivery (and other delivery companies) back to your application. When an order status changes in BMDelivery (e.g., from "EN_ROUTE" to "EXECUTE"), it will automatically update in your system.

## How It Works

There are **three ways** status synchronization happens:

### 1. Webhook Integration (Automatic - Recommended)

BMDelivery sends real-time status updates to your application whenever an order status changes.

**Webhook Endpoint:**
```
POST https://yourdomain.com/api/webhooks/bmdelivery/status-update
```

**How to Configure:**
1. Log into your BMDelivery dashboard
2. Go to API Settings or Webhook Configuration
3. Add the webhook URL above
4. BMDelivery will send POST requests whenever order statuses change

**Webhook Payload Example:**
```json
{
  "code": "DMD-123456",
  "tracking_code": "DMD-123456",
  "status": "EN_ROUTE"
}
```

**Status Mappings:**

BMDelivery Status → Your App Status
- `RAMASSAGE`, `EN ATTENTE`, `INTERESSE` → `confirmed`
- `EN COURS`, `EN ROUTE` → `shipped`
- `LIVRE`, `EXECUTE` → `delivered`
- `ANNULE`, `RETOUR`, `DEMANDE DE RETOUR` → `cancelled`

### 2. Manual Sync Button (On-Demand)

Users can manually sync the status for a specific order by clicking the "Sync Status" button in the order detail page.

**Steps:**
1. Navigate to Orders → View Order
2. Find the "Delivery Tracking" section
3. Click the "Sync Status" button
4. The system fetches the latest status from BMDelivery

**When to Use:**
- Webhook is not configured
- You want to check status immediately
- Troubleshooting delivery issues

### 3. Automatic Scheduled Sync (Background)

A command runs every 30 minutes to sync all active orders (confirmed/shipped) with their delivery companies.

**Command:**
```bash
php artisan orders:sync-delivery-statuses
```

**Options:**
```bash
# Sync a specific order
php artisan orders:sync-delivery-statuses --order-id=123

# Sync only BMDelivery orders
php artisan orders:sync-delivery-statuses --provider=bmdelivery
```

**Schedule Configuration:**
The command is scheduled in `routes/console.php` to run every 30 minutes automatically.

**To Enable Scheduling:**
Add this to your crontab (Linux/Mac) or Task Scheduler (Windows):
```bash
* * * * * cd /path-to-your-project && php artisan schedule:run >> /dev/null 2>&1
```

## Status Flow Example

1. **Order Created in Your App:**
   - Status: `pending`

2. **Order Confirmed & Sent to BMDelivery:**
   - Your App Status: `confirmed`
   - BMDelivery Status: `EN ATTENTE`
   - Tracking Code: `DMD-789012`

3. **BMDelivery Changes Status to "EN ROUTE":**
   - Webhook received OR sync command runs
   - Your App detects status change
   - Your App Status: `confirmed` → `shipped`
   - Delivery Status: `EN ROUTE`

4. **BMDelivery Changes Status to "EXECUTE":**
   - Webhook received OR sync command runs
   - Your App Status: `shipped` → `delivered`
   - Delivery Status: `EXECUTE`

## API Endpoints

### Sync Single Order Status
```http
POST /api/orders/{order}/sync-delivery-status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Order status synced successfully",
  "result": {
    "success": true,
    "order_id": 123,
    "order_number": "ORD-20260228-0001",
    "old_delivery_status": "EN ATTENTE",
    "new_delivery_status": "EN ROUTE",
    "status_changed": true,
    "order_status_updated": true,
    "new_order_status": "shipped"
  },
  "order": { ... }
}
```

### BMDelivery Webhook Handler
```http
POST /api/webhooks/bmdelivery/status-update
Content-Type: application/json

{
  "code": "DMD-123456",
  "status": "EN_ROUTE"
}
```

**Response:**
```json
{
  "message": "Webhook processed successfully"
}
```

## BMDelivery Status Reference

| BMDelivery Status | French Name | Description | Maps to App Status |
|-------------------|-------------|-------------|-------------------|
| RAMASSAGE | Ramassage | Pickup scheduled | confirmed |
| EN ATTENTE | En attente | Awaiting processing | confirmed |
| INTERESSE | Intéressé | Customer interested | confirmed |
| EN COURS | En cours | In progress | shipped |
| EN ROUTE | En route | Out for delivery | shipped |
| EXECUTE | Exécuté | Delivered successfully | delivered |
| LIVRE | Livré | Delivered | delivered |
| RETOUR | Retour | Returned | cancelled |
| DEMANDE DE RETOUR | Demande de retour | Return requested | cancelled |
| ANNULE | Annulé | Cancelled | cancelled |

## Troubleshooting

### Webhook Not Working

**Check:**
1. Is the webhook URL publicly accessible?
2. Is HTTPS enabled? (BMDelivery may require it)
3. Check Laravel logs: `storage/logs/laravel.log`
4. Test webhook manually:
   ```bash
   curl -X POST https://yourdomain.com/api/webhooks/bmdelivery/status-update \
     -H "Content-Type: application/json" \
     -d '{"code":"TEST-123","status":"EN_ROUTE"}'
   ```

### Manual Sync Not Working

**Check:**
1. Does the order have a tracking code?
2. Is the delivery integration active?
3. Is the API token valid?
4. Check BMDelivery API response in logs

### Scheduled Sync Not Running

**Check:**
1. Is the cron job configured?
   ```bash
   crontab -l  # Should show the schedule:run command
   ```
2. Is Laravel scheduler running?
   ```bash
   php artisan schedule:list  # Shows scheduled commands
   ```
3. Test the command manually:
   ```bash
   php artisan orders:sync-delivery-statuses
   ```

## Configuration

### Enable/Disable Auto-Sync

Edit `routes/console.php`:

```php
// Every 30 minutes (default)
Schedule::command('orders:sync-delivery-statuses')->everyThirtyMinutes();

// Every hour
Schedule::command('orders:sync-delivery-statuses')->hourly();

// Every 15 minutes
Schedule::command('orders:sync-delivery-statuses')->everyFifteenMinutes();

// Disable auto-sync (comment out the line)
// Schedule::command('orders:sync-delivery-statuses')->everyThirtyMinutes();
```

### Add Custom Status Mappings

Edit `app/Http/Controllers/WebhookController.php` or `app/Console/Commands/SyncDeliveryStatuses.php`:

```php
private function mapDeliveryStatusToOrderStatus(?string $deliveryStatus): ?string
{
    $statusMap = [
        // Add your custom mappings here
        'custom_status' => 'your_app_status',
    ];
    
    return $statusMap[strtolower($deliveryStatus)] ?? null;
}
```

## Testing

### Test Webhook Locally

Use a tool like [ngrok](https://ngrok.com/) to expose your local server:

```bash
ngrok http 8000
```

Then configure BMDelivery webhook with the ngrok URL:
```
https://your-ngrok-url.ngrok.io/api/webhooks/bmdelivery/status-update
```

### Test Manual Sync

1. Create a test order
2. Send it to BMDelivery
3. Change status in BMDelivery dashboard
4. Click "Sync Status" button in your app
5. Verify status updated correctly

### Test Scheduled Sync

```bash
# Run sync command manually
php artisan orders:sync-delivery-statuses

# Check output for success/failure
# Successful: X
# Failed: Y
# Status Changed: Z
```

## Security Considerations

### Webhook Security

Currently, the webhook endpoint is public (no authentication). For production, consider:

1. **IP Whitelist:** Only accept requests from BMDelivery IPs
2. **Signature Verification:** Verify webhook signatures from BMDelivery
3. **Rate Limiting:** Prevent abuse with rate limits

### API Token Storage

API tokens are stored encrypted in the database. Ensure:
- Database backups are secure
- `.env` file is not committed to version control
- Production environment uses strong passwords

## Support

For issues or questions:
1. Check Laravel logs: `storage/logs/laravel.log`
2. Check BMDelivery API documentation
3. Contact BMDelivery support for webhook setup help

## Summary

✅ **Webhook** = Real-time automatic updates (best option)
✅ **Manual Sync** = On-demand status refresh
✅ **Scheduled Sync** = Background automatic updates every 30 minutes

All three methods work together to ensure order statuses stay synchronized between your app and BMDelivery.

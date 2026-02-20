# Shopify Webhook Integration - Implementation Summary

## What Was Implemented

A **webhook-only Shopify integration** that allows receiving orders from Shopify **without requiring an API access token**. Orders are pushed directly from Shopify to your application in real-time.

## Key Features

✅ **No Access Token Required** - Only webhook secret needed
✅ **Real-Time Order Sync** - Orders appear instantly when created in Shopify
✅ **Secure Webhook Verification** - HMAC-SHA256 signature validation
✅ **Automatic Customer Creation** - Creates or updates customers automatically
✅ **Duplicate Prevention** - Won't create duplicate orders
✅ **Complete Order Data** - Captures all order details, items, and customer info

## Files Created/Modified

### New Files

1. **`app/Http/Controllers/WebhookController.php`**
   - Handles Shopify webhook requests
   - Verifies webhook signatures using HMAC-SHA256
   - Creates orders and customers automatically
   - Prevents duplicate order creation

2. **`database/migrations/2026_02_20_230914_add_webhook_fields_to_orders_table.php`**
   - Adds `city`, `phone`, and `payment_status` fields to orders table

3. **`SHOPIFY_WEBHOOK_GUIDE.md`**
   - Complete setup guide
   - Troubleshooting tips
   - Technical documentation

4. **`test_shopify_webhook.php`**
   - Test script to simulate Shopify webhooks
   - Useful for testing without creating real orders in Shopify

### Modified Files

1. **`routes/api.php`**
   - Added webhook routes:
     - `POST /api/webhooks/shopify/orders/create` - Main webhook endpoint
     - `POST /api/webhooks/test` - Test endpoint

2. **`resources/js/pages/ApiIntegrations/ShopifyIntegrationPage.jsx`**
   - Changed from access token to webhook secret
   - Added webhook URL display with copy button
   - Removed test connection and sync buttons
   - Updated help instructions

3. **`app/Models/Order.php`**
   - Added new fillable fields: `city`, `phone`, `payment_status`, `total_amount`

## How It Works

```
┌─────────────┐           ┌──────────────┐           ┌──────────────┐
│   Shopify   │  Webhook  │  Your App    │  Creates  │   Database   │
│   Store     │ ────────> │  (Laravel)   │ ────────> │   (Orders)   │
└─────────────┘           └──────────────┘           └──────────────┘
      │                          │
      │ 1. Order Created         │ 2. Verify Signature
      │ 2. Send Webhook          │ 3. Check for Duplicates
      │ 3. Include Signature     │ 4. Create/Update Customer
      │                          │ 5. Create Order
      │                          │ 6. Create Order Items
      └──────────────────────────┘
```

## Webhook Endpoint

```
POST https://your-domain.com/api/webhooks/shopify/orders/create
```

### Security

- **Public endpoint** (no Laravel authentication required)
- **Verified using HMAC-SHA256** signature from Shopify
- **Webhook secret** stored in integration settings
- Invalid signatures are rejected with 401 status

## Configuration Required

1. **In Shopify:**
   - Create webhook for "Order creation" event
   - Point to: `https://your-domain.com/api/webhooks/shopify/orders/create`
   - Copy the webhook secret

2. **In Your App:**
   - Go to API Integrations → Shopify
   - Enter shop name (optional)
   - Paste webhook secret
   - Save and enable integration

## Order Creation Flow

When a webhook is received:

1. **Verify Integration**
   - Check if Shopify integration exists and is active

2. **Verify Webhook Signature**
   - Calculate HMAC-SHA256 of request body
   - Compare with `X-Shopify-Hmac-SHA256` header
   - Reject if signature doesn't match

3. **Check for Duplicates**
   - Look for existing order with same `external_order_id`
   - Skip if order already exists

4. **Parse Order Data**
   - Extract customer information
   - Extract line items
   - Parse addresses and totals

5. **Create/Update Customer**
   - Search for existing customer by phone or email
   - Update customer info if found
   - Create new customer if not found

6. **Create Order**
   - Create order with status: `pending`
   - Set source: `shopify`
   - Link to customer
   - Store external order ID

7. **Create Order Items**
   - Create line items for each product
   - Match products by SKU if available
   - Store product name, quantity, price

## Database Schema Changes

Added to `orders` table:
```sql
- city (string, nullable) - Customer's city
- phone (string, nullable) - Customer's phone number
- payment_status (string, nullable) - Payment status from Shopify
```

## API Response Codes

| Code | Meaning |
|------|---------|
| 200 | Order already exists (duplicate) |
| 201 | Order created successfully |
| 401 | Webhook verification failed (invalid signature) |
| 404 | No active Shopify integration found |
| 500 | Internal error (check logs) |

## Testing

### Using the Test Script

```bash
php test_shopify_webhook.php
```

Update the webhook secret in the script before running.

### Using Postman/cURL

```bash
curl -X POST http://localhost:8000/api/webhooks/test
```

Should return:
```json
{
  "message": "Webhook endpoint is working",
  "received_at": "2024-01-01T12:00:00.000000Z"
}
```

## Logging

All webhook events are logged:

- **Success**: Order creation with order ID
- **Duplicate**: When order already exists
- **Error**: Verification failures and exceptions

Check logs at: `storage/logs/laravel.log`

## Comparison: Webhook vs API Token Integration

| Feature | Webhook (Implemented) | API Token (Previous) |
|---------|----------------------|---------------------|
| **Setup Complexity** | Simple | Complex (OAuth) |
| **Real-Time** | Yes (instant) | No (polling/manual sync) |
| **API Token Required** | ❌ No | ✅ Yes |
| **Shopify API Calls** | 0 (push) | Many (pull) |
| **Rate Limits** | None | Yes (2 calls/sec) |
| **Automatic** | ✅ Yes | Manual sync required |
| **Security** | HMAC verification | API token + SSL |

## Benefits

1. **Simpler Setup**
   - No need to create Shopify app
   - No OAuth flow
   - Just webhook secret

2. **Real-Time**
   - Orders appear instantly
   - No delay from polling

3. **Efficient**
   - No API calls from your app
   - No rate limit concerns
   - Lower server load

4. **Reliable**
   - Shopify retries failed webhooks
   - Automatic delivery guarantee

5. **Secure**
   - Cryptographic signature verification
   - Prevents unauthorized access

## Future Enhancements

Possible additions:

- [ ] Order update webhook (status changes)
- [ ] Order cancellation webhook
- [ ] Refund creation webhook
- [ ] Product sync webhook
- [ ] Fulfillment webhook
- [ ] Webhook retry queue
- [ ] Webhook event history

## Maintenance

### Monitoring

Monitor these metrics:
- Webhook success rate
- Processing time
- Duplicate rate
- Error rate

### Regular Checks

- Verify webhook is still active in Shopify
- Check webhook secret hasn't changed
- Monitor application logs for errors
- Test with real orders periodically

## Support

For issues or questions:

1. Check `SHOPIFY_WEBHOOK_GUIDE.md` for setup instructions
2. Check Laravel logs: `storage/logs/laravel.log`
3. Test webhook endpoint: `POST /api/webhooks/test`
4. Verify webhook secret matches Shopify
5. Check Shopify webhook delivery logs in Shopify Admin

## Notes

- Webhooks are **public endpoints** (no authentication middleware)
- Security is handled via **HMAC signature verification**
- Orders from webhooks have `source = 'shopify'`
- External order ID is used to prevent duplicates
- Customer data is automatically synced with orders

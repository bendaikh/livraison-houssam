# Shopify Webhook Integration Guide

## Overview

This integration allows you to receive orders from Shopify automatically via webhooks. **No API access token is required** - Shopify pushes orders directly to your application when they are created.

## How It Works

1. **Shopify creates an order** → Triggers the webhook
2. **Shopify sends order data** → To your webhook URL
3. **Your app verifies the webhook** → Using the webhook secret
4. **Order is created automatically** → In your system

## Setup Instructions

### Step 1: Get Your Webhook URL

Your webhook URL is:
```
https://your-domain.com/api/webhooks/shopify/orders/create
```

Replace `your-domain.com` with your actual domain.

### Step 2: Create Webhook in Shopify

1. Go to **Shopify Admin** → **Settings** → **Notifications**
2. Scroll down to the **Webhooks** section
3. Click **Create webhook**
4. Configure the webhook:
   - **Event**: Select `Order creation`
   - **Format**: Select `JSON`
   - **URL**: Paste your webhook URL
   - **API version**: Use the latest version (e.g., `2024-01`)
5. Click **Save**

### Step 3: Get Webhook Secret

After creating the webhook in Shopify:

1. Shopify will display a **webhook signing secret**
2. Copy this secret (it looks like: `f2e8576f07dc86d3e5ee8f7959f17902d8bf7669b7d1b53ceefaafc3d`)
3. Keep it safe - you'll need it in the next step

### Step 4: Configure Integration in Your App

1. Go to **API Integrations** → **Shopify**
2. Fill in the form:
   - **Integration Name**: Give it a name (e.g., "My Shopify Store")
   - **Shop Name** (optional): Your store name (e.g., "my-store" from my-store.myshopify.com)
   - **Webhook Secret**: Paste the secret from Step 3
3. Click **Save Integration**

### Step 5: Test the Integration

1. Create a test order in your Shopify store
2. Check your application's **Orders** section
3. The order should appear automatically within seconds

## Security

### Webhook Verification

All incoming webhooks are verified using HMAC-SHA256 signature validation:

- Shopify signs each webhook with your webhook secret
- Your app verifies the signature before processing
- Invalid webhooks are rejected automatically

### What Gets Verified

- `X-Shopify-Hmac-SHA256` header must be present
- Signature must match the calculated HMAC
- Only verified webhooks create orders

## Order Processing

### Automatic Order Creation

When a webhook is received, the system:

1. **Verifies the webhook** signature
2. **Checks for duplicates** (won't create duplicate orders)
3. **Creates or updates the customer** in your database
4. **Creates the order** with all items
5. **Logs the import** for tracking

### Order Data Mapping

| Shopify Field | Your App Field |
|--------------|----------------|
| Order ID | External Order ID |
| Order Name/Number | Order Number |
| Customer | Client |
| Line Items | Order Items |
| Financial Status | Payment Status |
| Total Price | Total Amount |
| Shipping Address | Shipping Address |
| Phone | Phone |
| Email | Client Email |

### Order Status

New orders from Shopify are created with:
- **Status**: `pending`
- **Payment Status**: Mapped from Shopify's financial status
- **Source**: `shopify`

## Troubleshooting

### Webhook Not Received

**Check 1: Webhook URL is correct**
- Make sure the URL is accessible from the internet
- Test the URL: `POST https://your-domain.com/api/webhooks/test`

**Check 2: Webhook is active in Shopify**
- Go to Shopify Admin → Settings → Notifications → Webhooks
- Make sure the webhook status is "Active"

**Check 3: Check logs**
- Go to your server logs
- Look for webhook-related errors
- Check the application logs for details

### Orders Not Creating

**Check 1: Webhook secret is correct**
- Make sure you copied the correct secret from Shopify
- The secret is case-sensitive

**Check 2: Integration is active**
- Go to API Integrations → Shopify
- Make sure "Enable this integration" is checked

**Check 3: Check for duplicates**
- The system won't create duplicate orders
- Check if the order already exists (search by Shopify order ID)

### Authentication Errors

If you see authentication errors:
1. The webhook secret is incorrect
2. Update the webhook secret in your integration settings
3. Make sure you copied it correctly from Shopify

## Webhook Events

Currently supported webhook events:

- ✅ **Order creation** - Automatically creates orders in your system

Future webhook events (can be added):
- Order updates
- Order cancellations
- Order fulfillment
- Refund creation

## API Endpoints

### Webhook Endpoint
```
POST /api/webhooks/shopify/orders/create
```
- **Public endpoint** (no authentication required)
- **Verifies webhook** signature
- **Creates order** automatically

### Test Endpoint
```
POST /api/webhooks/test
```
- **Public endpoint** (no authentication required)
- **Returns success** if webhook endpoint is working
- Use this to verify your webhook URL is accessible

## Technical Details

### Required HTTP Headers (sent by Shopify)

- `X-Shopify-Hmac-SHA256`: Webhook signature
- `X-Shopify-Topic`: Event topic (e.g., `orders/create`)
- `X-Shopify-Shop-Domain`: Store domain
- `Content-Type`: `application/json`

### Webhook Payload

Shopify sends the complete order object as JSON:

```json
{
  "id": 123456789,
  "name": "#1001",
  "email": "customer@example.com",
  "created_at": "2024-01-01T12:00:00Z",
  "total_price": "100.00",
  "subtotal_price": "90.00",
  "total_tax": "10.00",
  "currency": "USD",
  "financial_status": "paid",
  "fulfillment_status": null,
  "customer": {
    "id": 987654321,
    "email": "customer@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890"
  },
  "line_items": [
    {
      "id": 111222333,
      "product_id": 444555666,
      "variant_id": 777888999,
      "title": "Product Name",
      "quantity": 2,
      "price": "45.00",
      "sku": "PROD-001"
    }
  ],
  "shipping_address": {
    "address1": "123 Main St",
    "city": "New York",
    "province": "NY",
    "country": "United States",
    "zip": "10001"
  }
}
```

## Benefits of Webhook-Only Integration

✅ **No API Token Required** - Simpler setup, no complex OAuth flow
✅ **Real-Time Updates** - Orders appear instantly when created
✅ **Automatic Processing** - No manual syncing needed
✅ **Secure** - HMAC signature verification
✅ **Reliable** - Shopify retries failed webhooks automatically
✅ **Efficient** - Only processes new orders, no polling required

## Need Help?

- **Shopify Webhook Documentation**: https://shopify.dev/docs/api/admin-rest/latest/resources/webhook
- **HMAC Verification**: https://shopify.dev/docs/apps/webhooks/configuration/https#step-5-verify-the-webhook
- **Webhook Events**: https://shopify.dev/docs/api/admin-rest/latest/resources/webhook#event-topics

## Notes

- Webhooks are retried by Shopify if they fail (up to 19 times over 48 hours)
- Make sure your webhook URL is always accessible
- Keep your webhook secret secure and don't share it
- The integration can be disabled at any time without deleting the configuration
- Orders from Shopify are marked with source: "shopify" for easy filtering

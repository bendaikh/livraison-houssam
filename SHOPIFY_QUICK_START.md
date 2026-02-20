# Shopify Webhook Integration - Quick Start

## What You Need

1. ✅ A Shopify store
2. ✅ Admin access to your Shopify store
3. ✅ Your application deployed and accessible from the internet

## Setup Steps (5 minutes)

### 1. Configure in Your App

Navigate to: **API Integrations** → **Shopify**

You'll see a form with:
- **Integration Name**: Give it a name (e.g., "My Store")
- **Shop Name** (optional): Your store identifier
- **Webhook Secret**: Leave blank for now
- **Your Webhook URL**: Copy this URL (there's a Copy button)

### 2. Create Webhook in Shopify

1. Open your **Shopify Admin**
2. Go to **Settings** → **Notifications**
3. Scroll down to **Webhooks** section
4. Click **Create webhook**
5. Fill in:
   - **Event**: `Order creation`
   - **Format**: `JSON`
   - **URL**: Paste the webhook URL you copied
   - **API version**: Latest (e.g., `2024-01`)
6. Click **Save**
7. **Copy the webhook secret** that Shopify shows

### 3. Complete Setup in Your App

1. Go back to your app's Shopify integration page
2. Paste the webhook secret in the **Webhook Secret** field
3. Check **Enable this integration**
4. Click **Save Integration**

### 4. Test It

1. Create a test order in Shopify
2. Check your app's **Orders** section
3. The order should appear automatically

## That's It!

Your Shopify store is now connected. Every new order will automatically appear in your app.

## Webhook URL Format

```
https://your-domain.com/api/webhooks/shopify/orders/create
```

Replace `your-domain.com` with your actual domain.

For local testing:
```
http://localhost:8000/api/webhooks/shopify/orders/create
```

**Note**: Shopify can only send webhooks to publicly accessible URLs. For local testing, use a service like ngrok.

## Using ngrok for Local Testing

If you want to test locally:

```bash
# Install ngrok (https://ngrok.com)
# Then run:
ngrok http 8000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use it as: https://abc123.ngrok.io/api/webhooks/shopify/orders/create
```

## Troubleshooting

### Orders not appearing?

1. ✅ Check webhook is **Active** in Shopify
2. ✅ Check webhook secret is correct
3. ✅ Check integration is **enabled** in your app
4. ✅ Check server logs for errors

### Webhook verification failing?

- The webhook secret might be wrong
- Copy it again from Shopify
- Make sure there are no extra spaces

### Connection refused?

- Your webhook URL must be publicly accessible
- Check your server is running
- Check firewall settings

## What Happens When an Order is Created

```
Customer creates order in Shopify
           ↓
Shopify sends webhook to your app
           ↓
Your app verifies the webhook signature
           ↓
App creates or updates customer
           ↓
App creates order with all items
           ↓
Order appears in your Orders section
```

## Security

- Webhooks are verified using HMAC-SHA256
- Only valid webhooks from Shopify are accepted
- Webhook secret must be kept secure
- No API token needed (simpler and more secure)

## Benefits

✅ **Simple** - No complex API setup
✅ **Real-time** - Orders appear instantly
✅ **Automatic** - No manual sync needed
✅ **Secure** - Cryptographic verification
✅ **Reliable** - Shopify retries failed webhooks

## Next Steps

After setup:
- Test with a real order
- Check the order details in your app
- Monitor the webhook delivery in Shopify Admin
- Review the logs for any issues

## Need More Help?

See the complete documentation:
- `SHOPIFY_WEBHOOK_GUIDE.md` - Full setup guide
- `SHOPIFY_WEBHOOK_IMPLEMENTATION.md` - Technical details

## Example Webhook Secret

The webhook secret from Shopify looks like this:
```
f2e8576f07dc86d3e5ee8f7959f17902d8bf7669b7d1b53ceefaafc3d
```

Keep it secure and don't share it publicly!

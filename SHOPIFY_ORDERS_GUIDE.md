# Shopify Orders Integration Guide

## Overview

This application is fully integrated with Shopify to automatically import and manage orders from your Shopify store. Orders from Shopify are displayed in the Orders section alongside manually created orders.

## How It Works

### 1. Automatic Order Import (Webhooks)

When you set up the Shopify integration with webhook secret:
- Orders created in your Shopify store are **automatically** sent to your app via webhooks
- The app receives the order data in real-time
- A new order is created in your system with:
  - Source: `shopify`
  - Client information from Shopify customer
  - Order items from Shopify line items
  - Pricing, shipping, and tax information

**Webhook Endpoint:**
```
POST /api/webhooks/shopify/orders/create
```

### 2. Manual Sync

You can also manually sync orders from Shopify:
1. Go to the **Orders** page
2. Click the **"Sync Shopify Orders"** button
3. The app will fetch recent orders from Shopify API
4. Orders are imported if they don't already exist

**How to Set Up:**
- Navigate to **API Integrations** page
- Add/Edit your Shopify integration
- Enter your Shop URL and Access Token
- Optionally add Webhook Secret for secure webhooks
- Enable the integration

## Features

### Order Display

All orders from Shopify are shown in the Orders list with:
- **Source Badge**: Shows "Shopify" in green to identify Shopify orders
- **Order Details**: All order information including client, products, pricing
- **Status Management**: Update order status directly in the app
- **Filtering**: Filter orders by source (Shopify, Manual, etc.)
- **Statistics**: View count of orders by source

### Order Information

Each Shopify order includes:
- **Order Number**: Unique order identifier
- **Client Information**: Name, phone, email, address
- **Products**: Line items with quantities and prices
- **Financial Details**: Subtotal, shipping, tax, discount, total
- **Status**: Pending, Confirmed, Shipped, Delivered, Cancelled
- **External Order ID**: Shopify order ID for reference

### Source Filtering

Filter orders by source:
- **Manual**: Orders created directly in the app
- **Shopify**: Orders imported from Shopify
- **Delivery Company**: Orders from delivery service integrations
- **Marketplace**: Orders from marketplace integrations

## Setting Up Shopify Integration

### Prerequisites
1. A Shopify store
2. Shopify Admin API access token
3. (Optional) Webhook secret for secure webhooks

### Configuration Steps

1. **Get Shopify Credentials:**
   - Log into your Shopify admin panel
   - Go to Settings > Apps and sales channels > Develop apps
   - Create a new app or use an existing one
   - Get the Admin API access token
   - Note your shop URL (e.g., `yourstore.myshopify.com`)

2. **Add Integration in App:**
   - Navigate to **API Integrations**
   - Click **"Add Integration"** or edit existing Shopify integration
   - Fill in:
     - Name: "Shopify Store" (or your store name)
     - Type: Shopify
     - Shop URL: Your Shopify store URL
     - Access Token: Your Admin API access token
     - Webhook Secret: (Optional, for webhook verification)
   - Save and enable the integration

3. **Set Up Webhooks (Optional but Recommended):**
   - In your Shopify app settings
   - Add webhook for "Order creation"
   - Webhook URL: `https://yourdomain.com/api/webhooks/shopify/orders/create`
   - Format: JSON
   - Add webhook secret (same as in app configuration)

## Using the Orders Section

### Viewing Orders

1. Navigate to **Orders** section
2. You'll see all orders including those from Shopify
3. Look for the **Source** column to identify Shopify orders (green badge)

### Syncing Orders

1. Click **"Sync Shopify Orders"** button at the top
2. Wait for the sync to complete
3. A success message will show how many orders were imported
4. The orders list will refresh automatically

### Filtering Shopify Orders

1. Use the **"All Sources"** dropdown in the filters
2. Select **"Shopify"** to show only Shopify orders
3. Combine with other filters (status, date range, search)

### Managing Shopify Orders

You can:
- View order details
- Edit order information
- Update order status
- Assign delivery agents
- Track order history
- Send WhatsApp messages to customers
- Export order data

## Order Flow

```
Shopify Store → Webhook/API → Your App → Orders Section
     ↓
New Order
     ↓
Automatic Import (if webhook configured)
  OR
Manual Sync (click "Sync Shopify Orders")
     ↓
Order appears in Orders list
     ↓
Manage order (update status, assign agents, etc.)
```

## Troubleshooting

### Orders Not Appearing

1. **Check Shopify Integration:**
   - Go to API Integrations
   - Verify Shopify integration is active
   - Test connection using "Test Connection" button

2. **Check Credentials:**
   - Verify Shop URL is correct
   - Ensure Access Token is valid and has necessary permissions
   - Check if token has expired

3. **Check Webhooks:**
   - Verify webhook URL is correct
   - Check webhook secret matches
   - Look at webhook delivery logs in Shopify admin

4. **Manual Sync:**
   - Try clicking "Sync Shopify Orders" button
   - Check for any error messages
   - Look at browser console for errors

### Duplicate Orders

- The app checks for existing orders by `external_order_id`
- Duplicate orders are automatically skipped
- If you see duplicates, check if external_order_id is properly set

### Order Data Missing

- Some fields might be optional in Shopify
- The app handles missing data gracefully
- Products are matched by SKU if available
- New products are created automatically if not found

## API Endpoints

### Webhook Endpoint
```
POST /api/webhooks/shopify/orders/create
Headers:
  X-Shopify-Hmac-SHA256: [webhook signature]
Body: [Shopify order JSON]
```

### Manual Sync
```
POST /api/api-integrations/{id}/sync
Headers:
  Authorization: Bearer [token]
```

### List Orders
```
GET /api/orders?source=shopify
Headers:
  Authorization: Bearer [token]
```

## Best Practices

1. **Enable Webhooks**: For real-time order import
2. **Regular Syncing**: Manually sync periodically as backup
3. **Monitor Integration**: Check integration status regularly
4. **Test Connection**: Use test connection feature to verify setup
5. **Keep Credentials Secure**: Never share API tokens
6. **Update Status**: Keep order status updated for accurate tracking
7. **Check Logs**: Review import logs for any issues

## Statistics & Reporting

The Orders page shows:
- Total orders count
- Orders by source (Manual, Shopify, Delivery, Marketplace)
- Click on any statistic card to filter by that source
- View trends and analyze order sources

## Support

If you encounter issues:
1. Check the integration settings
2. Verify Shopify credentials
3. Look at import logs in API Integrations
4. Check browser console for JavaScript errors
5. Review Laravel logs for server errors

## Next Steps

- Set up delivery company integrations
- Configure automatic status updates
- Set up notifications for new orders
- Customize order workflows
- Integrate with other systems (inventory, accounting, etc.)

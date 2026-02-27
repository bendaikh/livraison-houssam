# Delivery Company Integration Feature

## Overview

This feature allows you to automatically send orders to integrated delivery companies (BMDelivery and Tawsilex) when changing the order status to "confirmed". The system will show a popup to select which delivery company should handle the order, and will automatically sync status updates from the delivery company back to your app.

## How It Works

### 1. Setup Delivery Integration

First, configure your delivery company integration in the **API Integrations** section:

1. Go to **Settings** → **API Integrations**
2. Add a new delivery integration (BMDelivery or Tawsilex)
3. Enter your API token from the delivery company
4. Set the integration as **Active**
5. Test the connection to ensure it's working

### 2. Confirming Orders with Delivery Company Selection

When you change an order status to "confirmed":

1. A popup modal will appear showing all available active delivery companies
2. Select the delivery company you want to use (BMDelivery or Tawsilex)
3. Click "Confirm & Send"
4. The system will:
   - Update the order status to "confirmed"
   - Send the order details to the selected delivery company
   - Store the tracking code returned by the delivery company
   - Record the delivery company used in the order

### 3. Viewing Delivery Information

Once an order is sent to a delivery company, you can view:

**In Order List:**
- Delivery tracking code
- Delivery company name (provider)
- Current delivery status from the company

**In Order Details:**
- Complete delivery tracking information
- Delivery company details
- Tracking code
- Current delivery status
- Date/time when sent to delivery company

### 4. Automatic Status Updates

The system receives webhooks from delivery companies when order status changes:

**Webhook Endpoints:**
- BMDelivery: `POST /api/webhooks/bmdelivery/status-update`
- Tawsilex: `POST /api/webhooks/tawsilex/status-update`

**Status Mapping:**
The system automatically maps delivery company statuses to internal order statuses:

| Delivery Status | Internal Order Status |
|----------------|----------------------|
| pending | pending |
| confirmed, ramassage, preparation | confirmed |
| picked_up, in_transit, out_for_delivery, en_cours, expedie | shipped |
| delivered, livre, livraison | delivered |
| cancelled, returned, failed, annule, retour | cancelled |

### 5. Configuring Webhooks with Delivery Companies

To receive automatic status updates, configure the webhook URL in your delivery company dashboard:

**BMDelivery:**
1. Login to your BMDelivery dashboard
2. Go to Settings → Webhooks
3. Add webhook URL: `https://yourdomain.com/api/webhooks/bmdelivery/status-update`
4. Select events: Order Status Changes
5. Save configuration

**Tawsilex:**
1. Login to your Tawsilex dashboard
2. Go to Settings → API → Webhooks
3. Add webhook URL: `https://yourdomain.com/api/webhooks/tawsilex/status-update`
4. Select events: Status Updates
5. Save configuration

## Technical Details

### Database Schema

New fields added to `orders` table:
- `delivery_integration_id`: Foreign key to api_integrations table
- `delivery_tracking_code`: Tracking code from delivery company
- `delivery_status`: Current status from delivery company
- `sent_to_delivery_at`: Timestamp when sent to delivery company

### API Endpoints

**Get Available Delivery Companies:**
```
GET /api/orders/delivery-companies/available
```

**Update Order Status with Delivery Company:**
```
PATCH /api/orders/{id}/status
Body: {
  "status": "confirmed",
  "delivery_integration_id": 1
}
```

**Webhook Endpoints (Public):**
```
POST /api/webhooks/bmdelivery/status-update
POST /api/webhooks/tawsilex/status-update
```

### Services

**BMDeliveryService:**
- `createShipmentFromOrder(Order $order)`: Creates shipment in BMDelivery
- `trackShipment(string $code)`: Gets tracking info
- `listShipments()`: Lists all shipments

**TawsilexService:**
- `createShipmentFromOrder(Order $order)`: Creates shipment in Tawsilex
- `trackShipment(string $code)`: Gets tracking info
- `listShipments()`: Lists all shipments

**OrderService:**
- `updateOrderStatus()`: Enhanced to handle delivery company integration
- `sendOrderToDeliveryCompany()`: Sends order to selected delivery company

## User Workflow Example

1. **Customer places order** → Order created with status "pending"
2. **Admin confirms order** → Modal appears to select delivery company
3. **Admin selects BMDelivery** → Order sent to BMDelivery, tracking code received
4. **BMDelivery picks up package** → Webhook updates order status to "shipped"
5. **BMDelivery delivers package** → Webhook updates order status to "delivered"
6. **Admin views order** → Sees complete delivery tracking history

## Benefits

- **Automation**: Orders are automatically sent to delivery companies
- **Real-time Tracking**: Status updates from delivery companies are synced automatically
- **Flexibility**: Choose different delivery companies for different orders
- **Visibility**: Complete delivery tracking information in one place
- **Integration**: Works seamlessly with existing order management workflow

## Troubleshooting

**Issue: Delivery modal doesn't appear**
- Check that you have at least one active delivery integration configured
- Verify the integration is set to "Active" in API Integrations

**Issue: Order not sent to delivery company**
- Check API token is valid
- Test the connection in API Integrations
- Check Laravel logs for error messages

**Issue: Webhooks not working**
- Verify webhook URL is correctly configured in delivery company dashboard
- Check that webhook URL is publicly accessible
- Review Laravel logs for webhook processing errors

**Issue: Status not updating**
- Verify delivery company is sending webhooks
- Check webhook logs in your server
- Ensure tracking code matches between systems

## Future Enhancements

Potential improvements for this feature:
- Support for more delivery companies
- Bulk sending orders to delivery companies
- Advanced tracking visualization
- Delivery cost calculation
- Estimated delivery time display
- Customer notification when order is shipped
- Return/exchange handling through delivery companies

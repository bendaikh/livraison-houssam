# BMDelivery Status Sync Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BMDelivery Status Synchronization                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  METHOD 1: WEBHOOK (Real-time, Automatic) ⚡                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    Your App                 BMDelivery                  Your App
       │                          │                          │
       │  1. Send Order           │                          │
       ├─────────────────────────>│                          │
       │     (tracking code)       │                          │
       │                          │                          │
       │                          │  2. Status Changes       │
       │                          │     (EN ATTENTE →        │
       │                          │      EN ROUTE)           │
       │                          │                          │
       │                          │  3. Webhook POST         │
       │                          ├─────────────────────────>│
       │                          │  {code, status}          │
       │                          │                          │
       │                          │  4. Update Status        │
       │                          │     - delivery_status    │
       │                          │     - order status       │
       │                          │<─────────────────────────┤
       │                          │  200 OK                  │
       │                          │                          │
       │  5. User sees updated    │                          │
       │     status automatically │                          │
       │<─────────────────────────┼──────────────────────────┤
       │                          │                          │


┌─────────────────────────────────────────────────────────────────────────────┐
│  METHOD 2: MANUAL SYNC (On-demand) 🔄                                       │
└─────────────────────────────────────────────────────────────────────────────┘

    User Interface           Your API                 BMDelivery API
         │                      │                          │
         │  1. Click "Sync     │                          │
         │     Status" button   │                          │
         ├─────────────────────>│                          │
         │                      │  2. GET /track/{code}    │
         │                      ├─────────────────────────>│
         │                      │                          │
         │                      │  3. Return status        │
         │                      │<─────────────────────────┤
         │                      │  {status: "EN ROUTE"}    │
         │                      │                          │
         │                      │  4. Update database      │
         │                      │     - Compare old/new    │
         │                      │     - Update if changed  │
         │                      │                          │
         │  5. Show result      │                          │
         │<─────────────────────┤                          │
         │  "Status updated!"   │                          │
         │                      │                          │


┌─────────────────────────────────────────────────────────────────────────────┐
│  METHOD 3: SCHEDULED SYNC (Background, Every 30 min) ⏰                     │
└─────────────────────────────────────────────────────────────────────────────┘

   Laravel Scheduler         Sync Command              BMDelivery API
         │                      │                          │
         │  1. Every 30 min     │                          │
         │     trigger command  │                          │
         ├─────────────────────>│                          │
         │                      │  2. Get all active       │
         │                      │     orders (confirmed/   │
         │                      │     shipped)             │
         │                      │                          │
         │                      │  3. For each order:      │
         │                      │     GET /track/{code}    │
         │                      ├─────────────────────────>│
         │                      │                          │
         │                      │  4. Return status        │
         │                      │<─────────────────────────┤
         │                      │  {status: "EXECUTE"}     │
         │                      │                          │
         │                      │  5. Update if changed    │
         │                      │     - Compare old/new    │
         │                      │     - Update status      │
         │                      │     - Log changes        │
         │                      │                          │
         │  6. Report results   │                          │
         │<─────────────────────┤                          │
         │  Success: 10         │                          │
         │  Changed: 3          │                          │
         │                      │                          │


┌─────────────────────────────────────────────────────────────────────────────┐
│  Status Mapping Flow                                                         │
└─────────────────────────────────────────────────────────────────────────────┘

   BMDelivery Status              Your App Order Status
   ─────────────────              ─────────────────────

   EN ATTENTE     ────────────>   confirmed
   RAMASSAGE      ────────────>   confirmed
   INTERESSE      ────────────>   confirmed
                                       │
   EN COURS       ────────────>   shipped
   EN ROUTE       ────────────>   shipped
                                       │
   EXECUTE        ────────────>   delivered
   LIVRE          ────────────>   delivered
                                       │
   RETOUR         ────────────>   cancelled
   ANNULE         ────────────>   cancelled
   DEMANDE DE     ────────────>   cancelled
   RETOUR


┌─────────────────────────────────────────────────────────────────────────────┐
│  Database Updates                                                            │
└─────────────────────────────────────────────────────────────────────────────┘

   orders table
   ├── delivery_status (BMDelivery status: "EN ROUTE", "EXECUTE", etc.)
   ├── status (Your app status: "confirmed", "shipped", "delivered", etc.)
   ├── delivery_tracking_code (BMDelivery tracking code)
   └── sent_to_delivery_at (timestamp)

   order_history table
   └── New entry created when status changes
       ├── order_id
       ├── status
       ├── note ("Status synced from BMDelivery: EN ROUTE")
       └── created_at


┌─────────────────────────────────────────────────────────────────────────────┐
│  Example Timeline                                                            │
└─────────────────────────────────────────────────────────────────────────────┘

   Day 1, 10:00 AM - Order created in your app
                     Status: pending

   Day 1, 10:30 AM - Order confirmed & sent to BMDelivery
                     Your Status: confirmed
                     BMDelivery Status: EN ATTENTE
                     Tracking: DMD-123456

   Day 1, 2:00 PM  - BMDelivery picks up package
                     BMDelivery Status: EN ROUTE
                     ↓ (webhook received OR sync runs)
                     Your Status: shipped ✓

   Day 1, 5:30 PM  - Package delivered
                     BMDelivery Status: EXECUTE
                     ↓ (webhook received OR sync runs)
                     Your Status: delivered ✓
                     Stock deducted automatically


┌─────────────────────────────────────────────────────────────────────────────┐
│  Integration Points                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

   1. WebhookController.php
      └── handleBMDeliveryWebhook()
          └── Receives POST from BMDelivery
          └── Updates order
          └── Maps status
          └── Triggers OrderService

   2. BMDeliveryService.php
      └── syncOrderStatus()
          └── Calls BMDelivery API
          └── Returns status data
          └── Updates order

   3. OrderController.php
      └── syncDeliveryStatus()
          └── API endpoint for manual sync
          └── Returns JSON response

   4. SyncDeliveryStatuses Command
      └── Runs every 30 minutes
      └── Syncs all active orders
      └── Logs results


┌─────────────────────────────────────────────────────────────────────────────┐
│  Error Handling                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

   Scenario                          Action
   ────────────────────────────────  ─────────────────────────────────────
   Webhook fails                  -> Scheduled sync will catch it
   API token invalid              -> Error logged, alert admin
   BMDelivery API down            -> Retry on next sync (30 min)
   Unknown status received        -> Log warning, keep old status
   Tracking code not found        -> Skip order, log error
   Network timeout                -> Retry on next sync


┌─────────────────────────────────────────────────────────────────────────────┐
│  Monitoring & Logging                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

   storage/logs/laravel.log
   ├── "BMDelivery webhook received"
   ├── "Order delivery status synced from BMDelivery"
   ├── "Order status updated: confirmed → shipped"
   ├── "Failed to sync order status from BMDelivery"
   └── "BMDelivery API response: {...}"

   Check logs with:
   tail -f storage/logs/laravel.log | grep BMDelivery
```

## Key Benefits

✅ **Real-time Updates:** Webhook provides instant status updates
✅ **Reliability:** Scheduled sync catches any missed webhooks
✅ **Manual Control:** Users can manually refresh status anytime
✅ **Automatic Status Mapping:** BMDelivery statuses automatically map to your app
✅ **Full History:** All status changes logged in order_history
✅ **Error Resilient:** Multiple sync methods provide redundancy

## Recommended Setup

**Best Practice:** Use all three methods together!

1. **Webhook** - Primary method for real-time updates
2. **Scheduled Sync** - Backup to catch any missed webhooks
3. **Manual Sync** - Troubleshooting and immediate updates when needed

This ensures your order statuses are always accurate and up-to-date! 🎉

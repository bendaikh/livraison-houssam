# System Flow Diagram - Delivery Integration

## Complete Flow Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DELIVERY INTEGRATION FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: ORDER CONFIRMATION WITH DELIVERY COMPANY SELECTION                  │
└──────────────────────────────────────────────────────────────────────────────┘

    User (Admin/Staff)
         │
         │ 1. Opens Order List
         ↓
    ┌────────────────┐
    │  Order List    │
    │  Component     │
    └────────────────┘
         │
         │ 2. Changes status dropdown to "Confirmed"
         ↓
    ┌────────────────┐
    │ handleStatus   │  3. Detects "confirmed" status
    │ Change()       │     Shows modal instead of direct update
    └────────────────┘
         │
         ↓
    ┌────────────────────────────────────┐
    │   DeliveryCompanyModal             │
    │                                    │
    │   GET /api/orders/                 │  4. Fetches active
    │       delivery-companies/available │     delivery companies
    │                                    │
    │   Display:                         │
    │   ○ BMDelivery                    │
    │   ○ Tawsilex                      │  5. User selects company
    └────────────────────────────────────┘
         │
         │ 6. User clicks "Confirm & Send"
         ↓
    ┌────────────────────────────────────┐
    │ PATCH /api/orders/{id}/status      │
    │                                    │
    │ Body: {                            │
    │   status: "confirmed",             │
    │   delivery_integration_id: 1       │  7. Sends to backend
    │ }                                  │
    └────────────────────────────────────┘
         │
         ↓

┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: BACKEND PROCESSING                                                  │
└──────────────────────────────────────────────────────────────────────────────┘

    OrderController::updateStatus()
         │
         │ 8. Receives request
         ↓
    OrderService::updateOrderStatus(
         orderId, 
         "confirmed", 
         note, 
         deliveryIntegrationId
    )
         │
         │ 9. Updates order status
         ↓
    ┌────────────────────────────────────┐
    │ IF status == "confirmed" AND       │
    │ deliveryIntegrationId is provided  │  10. Check conditions
    └────────────────────────────────────┘
         │
         │ TRUE
         ↓
    OrderService::sendOrderToDeliveryCompany()
         │
         │ 11. Gets delivery integration details
         ↓
    ┌────────────────────────────────────┐
    │ ApiIntegration Model               │
    │ - provider: "bmdelivery"           │
    │ - credentials: { api_token: "..." }│  12. Load integration
    └────────────────────────────────────┘
         │
         ↓
    IF provider == "bmdelivery"
         │
         ↓
    ┌────────────────────────────────────┐
    │ BMDeliveryService                  │
    │ ::createShipmentFromOrder()        │
    │                                    │
    │ POST https://bmdelivery.ma/api/    │  13. Call external API
    │      client/post/colis/add-colis   │
    │                                    │
    │ Body: {                            │
    │   fullname: "John Doe",            │
    │   phone: "0612345678",             │
    │   city: "Casablanca",              │
    │   address: "123 Main St",          │
    │   price: 500.00,                   │
    │   product: "Product 1",            │
    │   qty: "2",                        │
    │   internal_id: "ORD-12345"         │
    │ }                                  │
    └────────────────────────────────────┘
         │
         │ 14. Receives response
         ↓
    ┌────────────────────────────────────┐
    │ Response: {                        │
    │   success: true,                   │
    │   data: {                          │
    │     code: "BM-20260227-1234",     │  15. Extract tracking code
    │     status: "pending"              │
    │   }                                │
    │ }                                  │
    └────────────────────────────────────┘
         │
         │ 16. Update order in database
         ↓
    ┌────────────────────────────────────┐
    │ Order::update([                    │
    │   delivery_integration_id: 1,      │
    │   delivery_tracking_code:          │
    │     "BM-20260227-1234",           │
    │   delivery_status: "sent",         │
    │   sent_to_delivery_at: now()      │  17. Store tracking info
    │ ])                                 │
    └────────────────────────────────────┘
         │
         │ 18. Add history entry
         ↓
    ┌────────────────────────────────────┐
    │ OrderHistory::create([             │
    │   order_id: 123,                   │
    │   status: "confirmed",             │
    │   note: "Order sent to BMDelivery. │
    │          Tracking: BM-20260227..."  │  19. Log action
    │ ])                                 │
    └────────────────────────────────────┘
         │
         │ 20. Return updated order
         ↓
    Frontend receives updated order
         │
         │ 21. Updates UI
         ↓
    ┌────────────────────────────────────┐
    │ Order List shows:                  │
    │                                    │
    │ | Status    | Delivery      |     │
    │ |-----------|---------------|     │
    │ | Confirmed | BM-20260227...│     │  22. Display tracking
    │ |           | bmdelivery    │     │
    │ |           | sent          │     │
    └────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: DELIVERY COMPANY STATUS UPDATES (WEBHOOKS)                         │
└──────────────────────────────────────────────────────────────────────────────┘

    BMDelivery System
         │
         │ 23. Driver picks up package
         ↓
    ┌────────────────────────────────────┐
    │ BMDelivery updates status:         │
    │   status: "in_transit"             │  24. Status changed in their system
    └────────────────────────────────────┘
         │
         │ 25. BMDelivery sends webhook
         ↓
    ┌────────────────────────────────────┐
    │ POST https://yourapp.com/api/      │
    │      webhooks/bmdelivery/          │
    │      status-update                 │
    │                                    │
    │ Body: {                            │
    │   code: "BM-20260227-1234",       │  26. Webhook payload
    │   status: "in_transit"             │
    │ }                                  │
    └────────────────────────────────────┘
         │
         ↓
    WebhookController::handleBMDeliveryWebhook()
         │
         │ 27. Receives webhook
         ↓
    ┌────────────────────────────────────┐
    │ Find order by tracking code        │  28. Lookup order
    │ Order::where(                      │
    │   'delivery_tracking_code',        │
    │   'BM-20260227-1234'              │
    │ )->first()                         │
    └────────────────────────────────────┘
         │
         │ 29. Order found
         ↓
    ┌────────────────────────────────────┐
    │ Order::update([                    │
    │   delivery_status: "in_transit"    │  30. Update delivery status
    │ ])                                 │
    └────────────────────────────────────┘
         │
         │ 31. Map delivery status to order status
         ↓
    ┌────────────────────────────────────┐
    │ mapDeliveryStatusToOrderStatus()   │
    │                                    │
    │ "in_transit" → "shipped"          │  32. Status mapping
    └────────────────────────────────────┘
         │
         │ 33. IF mapped status differs from current
         ↓
    ┌────────────────────────────────────┐
    │ OrderService::updateOrderStatus(   │
    │   orderId,                         │
    │   "shipped",                       │  34. Update order status
    │   "Status updated from BMDelivery" │
    │ )                                  │
    └────────────────────────────────────┘
         │
         │ 35. Add history entry
         ↓
    ┌────────────────────────────────────┐
    │ OrderHistory::create([             │
    │   status: "shipped",               │
    │   note: "Status updated from       │  36. Log webhook update
    │          BMDelivery: in_transit"   │
    │ ])                                 │
    └────────────────────────────────────┘
         │
         │ 37. Create notification
         ↓
    ┌────────────────────────────────────┐
    │ Notification::create([             │
    │   type: "order_status_change",     │
    │   message: "Order #ORD-12345       │  38. Notify admin/staff
    │             status changed..."      │
    │ ])                                 │
    └────────────────────────────────────┘
         │
         │ 39. User refreshes page or receives real-time update
         ↓
    ┌────────────────────────────────────┐
    │ Order List displays updated info:  │
    │                                    │
    │ | Status  | Delivery        |     │
    │ |---------|-----------------|     │
    │ | Shipped | BM-20260227...  │     │  40. UI shows latest status
    │ |         | bmdelivery      │     │
    │ |         | in transit      │     │
    └────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: VIEWING TRACKING INFORMATION                                        │
└──────────────────────────────────────────────────────────────────────────────┘

    User clicks Order Number
         │
         ↓
    ┌────────────────────────────────────┐
    │ GET /api/orders/{id}               │  41. Fetch order details
    └────────────────────────────────────┘
         │
         ↓
    OrderController::show()
         │
         │ 42. Load order with relationships
         ↓
    ┌────────────────────────────────────┐
    │ Order::with([                      │
    │   'client',                        │
    │   'items',                         │
    │   'deliveryIntegration',           │  43. Include delivery info
    │   'history'                        │
    │ ])                                 │
    └────────────────────────────────────┘
         │
         │ 44. Return order data
         ↓
    ┌────────────────────────────────────┐
    │ Response: {                        │
    │   id: 123,                         │
    │   status: "shipped",               │
    │   delivery_integration: {          │
    │     name: "BMDelivery Morocco",    │
    │     provider: "bmdelivery"         │
    │   },                               │
    │   delivery_tracking_code:          │
    │     "BM-20260227-1234",           │  45. Complete tracking data
    │   delivery_status: "in_transit",   │
    │   sent_to_delivery_at:            │
    │     "2026-02-27 14:30:00",        │
    │   ...                              │
    │ }                                  │
    └────────────────────────────────────┘
         │
         │ 46. OrderDetail component renders
         ↓
    ┌────────────────────────────────────┐
    │ Delivery Tracking Card:            │
    │                                    │
    │ Delivery Company                   │
    │ ✓ BMDelivery Morocco              │
    │                                    │
    │ Tracking Code                      │
    │ ✓ BM-20260227-1234                │
    │                                    │
    │ Delivery Status                    │  47. Display all tracking info
    │ ✓ [In Transit]                    │
    │                                    │
    │ Sent to Delivery                   │
    │ ✓ Feb 27, 2026 at 2:30 PM        │
    └────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ FINAL STATE: COMPLETED DELIVERY                                              │
└──────────────────────────────────────────────────────────────────────────────┘

    48. BMDelivery driver delivers package
         ↓
    49. BMDelivery updates status to "delivered"
         ↓
    50. Webhook sent to your app
         ↓
    51. Order status updated to "delivered"
         ↓
    52. Stock deducted automatically
         ↓
    53. Client stats updated
         ↓
    54. Notifications sent
         ↓
    ✅ ORDER COMPLETE WITH FULL TRACKING HISTORY


═══════════════════════════════════════════════════════════════════════════════
                            KEY COMPONENTS
═══════════════════════════════════════════════════════════════════════════════

Frontend Components:
├── OrderList.jsx ..................... Shows orders with delivery tracking
├── OrderDetail.jsx ................... Displays complete tracking info
└── DeliveryCompanyModal.jsx .......... Handles company selection

Backend Controllers:
├── OrderController.php ............... Manages order operations
└── WebhookController.php ............. Handles delivery webhooks

Services:
├── OrderService.php .................. Core order business logic
├── BMDeliveryService.php ............. BMDelivery API integration
└── TawsilexService.php ............... Tawsilex API integration

Models:
├── Order.php ......................... Order entity with delivery fields
└── ApiIntegration.php ................ Delivery company configurations

Database:
└── orders table ...................... Stores tracking and status info

API Endpoints:
├── PATCH /orders/{id}/status ......... Update status with delivery
├── GET /orders/delivery-companies..... Get available companies
└── POST /webhooks/{provider} ......... Receive status updates

═══════════════════════════════════════════════════════════════════════════════
                         DATA FLOW SUMMARY
═══════════════════════════════════════════════════════════════════════════════

1. User Action → Modal Display
2. Company Selection → API Request
3. Backend Processing → External API Call
4. Tracking Code Received → Database Update
5. UI Update → Display Tracking Info
6. Webhook Received → Status Update
7. Notification → User Informed
8. Complete Delivery → Final Status

═══════════════════════════════════════════════════════════════════════════════
```

## Status Mapping Reference

```
┌────────────────────────────────────────────────────────────────┐
│                    STATUS MAPPING TABLE                        │
├────────────────────────────────────────────────────────────────┤
│ Delivery Company Status    │  Internal Order Status            │
├────────────────────────────┼───────────────────────────────────┤
│ pending                    │  pending                          │
│ confirmed                  │  confirmed                        │
│ ramassage                  │  confirmed                        │
│ preparation                │  confirmed                        │
│ picked_up                  │  shipped                          │
│ in_transit                 │  shipped                          │
│ out_for_delivery           │  shipped                          │
│ en_cours                   │  shipped                          │
│ expedie                    │  shipped                          │
│ delivered                  │  delivered                        │
│ livre                      │  delivered                        │
│ livraison                  │  delivered                        │
│ cancelled                  │  cancelled                        │
│ returned                   │  cancelled                        │
│ failed                     │  cancelled                        │
│ annule                     │  cancelled                        │
│ retour                     │  cancelled                        │
└────────────────────────────┴───────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────┐
│              ERROR HANDLING AT EACH STEP                │
└─────────────────────────────────────────────────────────┘

Step 1: Fetch Delivery Companies
    ├─ Success: Display companies
    └─ Error: Show "No companies found" message

Step 2: Send to Delivery API
    ├─ Success: Store tracking code
    └─ Error: Order still confirmed, log error, show alert

Step 3: Receive Webhook
    ├─ Success: Update status
    ├─ Order not found: Log warning, return 404
    └─ Invalid data: Log error, return 400

Step 4: Update Order Status
    ├─ Success: Notify users
    └─ Error: Log error, maintain old status

All errors are:
✓ Logged to Laravel logs
✓ Handled gracefully
✓ Don't break user workflow
✓ Provide meaningful feedback
```

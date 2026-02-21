# Vendor Role System Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LOGIN                               │
│                                                                   │
│  Email: vendor@example.com                                       │
│  Password: ********                                               │
│                                                                   │
│  Laravel Auth → Check users table → Load role                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ROLE CHECK                                  │
│                                                                   │
│  if (user.role.slug === 'vendor') {                             │
│      $vendor = Vendor::where('user_id', user.id)->first()       │
│      $vendorId = $vendor->id                                     │
│      // Filter all queries by vendor_id                          │
│  }                                                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐          ┌──────────────┐
│   ADMIN      │          │   VENDOR     │
│   ROLE       │          │   ROLE       │
└──────┬───────┘          └──────┬───────┘
       │                         │
       │                         │
       ▼                         ▼
┌──────────────┐          ┌──────────────┐
│  FULL ACCESS │          │  RESTRICTED  │
│              │          │   ACCESS     │
│ ✅ Dashboard │          │              │
│ ✅ Products  │          │ ✅ Dashboard │
│ ✅ Stock     │          │ ❌ Products  │
│ ✅ Orders    │          │ ❌ Stock     │
│ ✅ Vendors   │          │ ✅ Orders    │
│ ✅ Expenses  │          │ ❌ Vendors   │
│ ✅ Users     │          │ ❌ Expenses  │
│ ✅ All APIs  │          │ ❌ Users     │
│              │          │ ✅ Shopify   │
└──────────────┘          └──────────────┘
```

## Database Relationships

```
┌─────────────┐
│    users    │
│─────────────│
│ id          │◄────────┐
│ name        │         │
│ email       │         │ user_id (FK)
│ password    │         │
│ role_id     │         │
└─────────────┘         │
                        │
┌─────────────┐         │
│   vendors   │─────────┘
│─────────────│
│ id          │◄────────────────────────┐
│ user_id     │ (FK to users)           │
│ name        │                         │
│ email       │                         │ vendor_id (FK)
│ phone       │                         │
└─────┬───────┘                         │
      │                                 │
      │ vendor_id (FK)                  │
      │                                 │
      ├────────────────┬────────────────┼─────────────┬──────────────┐
      │                │                │             │              │
      ▼                ▼                ▼             ▼              ▼
┌──────────┐    ┌──────────┐    ┌──────────┐  ┌──────────┐  ┌────────────┐
│  orders  │    │marketplace│    │   api_   │  │products  │  │  clients   │
│──────────│    │_products │    │integr.   │  │──────────│  │────────────│
│ id       │    │──────────│    │──────────│  │ id       │  │ id         │
│vendor_id │    │vendor_id │    │vendor_id │  │vendor_id │  │ (via orders│
│client_id │    │product_id│    │ type     │  │ name     │  │  relation) │
│ total    │    │is_active │    │ name     │  │ sku      │  └────────────┘
│ status   │    │commission│    │ creds    │  │ price    │
│ source   │    └──────────┘    └──────────┘  └──────────┘
└──────────┘
```

## Data Flow: Vendor Dashboard Request

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Frontend Request                                         │
│ GET /api/dashboard?period=daily                                 │
│ Headers: Authorization: Bearer {token}                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: DashboardController                                      │
│                                                                   │
│ public function index(Request $request) {                        │
│     $user = $request->user();                                    │
│     $vendorId = null;                                            │
│                                                                   │
│     if ($user->role->slug === 'vendor') {                        │
│         $vendor = Vendor::where('user_id', $user->id)->first(); │
│         $vendorId = $vendor->id; // e.g., 5                      │
│     }                                                             │
│                                                                   │
│     $stats = DashboardService::getStatistics('daily', $vendorId);│
│     return response()->json($stats);                             │
│ }                                                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: DashboardService Filters Data                           │
│                                                                   │
│ getSalesStats($dateRange, $vendorId = 5)                         │
│ → SELECT SUM(total) FROM orders                                  │
│   WHERE vendor_id = 5                                            │
│   AND created_at BETWEEN '2026-02-21' AND NOW()                 │
│                                                                   │
│ getOrdersStats($dateRange, $vendorId = 5)                        │
│ → SELECT COUNT(*) FROM orders                                    │
│   WHERE vendor_id = 5                                            │
│   GROUP BY status                                                │
│                                                                   │
│ getTopProducts($dateRange, $vendorId = 5)                        │
│ → SELECT products.*, SUM(quantity) as total_sold                │
│   FROM products                                                  │
│   JOIN order_items ON products.id = order_items.product_id      │
│   JOIN orders ON order_items.order_id = orders.id               │
│   WHERE orders.vendor_id = 5                                     │
│   GROUP BY products.id                                           │
│   ORDER BY total_sold DESC LIMIT 5                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Return Filtered Data                                    │
│                                                                   │
│ {                                                                 │
│   "sales": 15420.50,          // Only vendor's sales             │
│   "orders": {                                                     │
│     "total": 42,               // Only vendor's orders            │
│     "pending": 5,                                                │
│     "confirmed": 20,                                             │
│     "delivered": 15                                              │
│   },                                                              │
│   "top_products": [            // Only products vendor sold      │
│     { "name": "Product A", "total_sold": 120 },                 │
│     { "name": "Product B", "total_sold": 95 }                   │
│   ],                                                              │
│   "recent_orders": [...]       // Only vendor's recent orders    │
│ }                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Orders List Request

```
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: GET /api/orders                                        │
│ User: Vendor (role.slug = 'vendor')                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ OrderController::index()                                         │
│                                                                   │
│ $query = Order::with(['client', 'vendor', 'items.product']);    │
│                                                                   │
│ // Check if user is vendor                                       │
│ $user = $request->user();                                        │
│ if ($user->role->slug === 'vendor') {                            │
│     $vendor = Vendor::where('user_id', $user->id)->first();     │
│     if ($vendor) {                                               │
│         $query->where('vendor_id', $vendor->id); // FILTER!     │
│     }                                                             │
│ }                                                                 │
│                                                                   │
│ return $query->latest()->paginate(15);                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ SQL Query Executed:                                              │
│                                                                   │
│ SELECT * FROM orders                                             │
│ WHERE vendor_id = 5              ← FILTERED BY VENDOR            │
│ ORDER BY created_at DESC                                         │
│ LIMIT 15                                                          │
│                                                                   │
│ Result: Only orders belonging to vendor #5                       │
└─────────────────────────────────────────────────────────────────┘
```

## Menu System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ MainLayout.jsx                                                   │
│                                                                   │
│ const menuItems = [                                              │
│     { path: '/', label: 'Dashboard' },                          │
│     { path: '/products', adminOnly: true },  ← Hidden for vendor│
│     { path: '/stock', adminOnly: true },     ← Hidden for vendor│
│     { path: '/marketplace', label: 'Marketplace' },             │
│     { path: '/orders', label: 'Orders' },                       │
│     { path: '/vendors', adminOnly: true },   ← Hidden for vendor│
│     {                                                             │
│         path: '/api-integrations',                               │
│         subItems: user?.role?.slug === 'vendor'                 │
│             ? [{ path: '/shopify' }]         ← Only Shopify     │
│             : [                                                   │
│                 { path: '/shopify' },        ← All integrations │
│                 { path: '/tawsilex' },                           │
│                 { path: '/bmdelivery' }                          │
│               ]                                                   │
│     }                                                             │
│ ];                                                                │
│                                                                   │
│ // Render logic                                                  │
│ menuItems.map(item => {                                          │
│     if (item.adminOnly && user.role.slug === 'vendor')          │
│         return null; // Don't show to vendors                   │
│     return <MenuItem item={item} />;                            │
│ })                                                                │
└─────────────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ SECURITY LAYERS                                                  │
│                                                                   │
│ Layer 1: Frontend UI                                             │
│ ├─ Menu items hidden based on role                              │
│ ├─ Routes protected by role check                               │
│ └─ Buttons disabled for unauthorized actions                    │
│                                                                   │
│ Layer 2: API Authentication                                      │
│ ├─ Laravel Sanctum/Passport token validation                    │
│ ├─ Middleware: auth, verified                                    │
│ └─ User identity established                                     │
│                                                                   │
│ Layer 3: Controller Authorization                                │
│ ├─ Role check: $user->role->slug                                │
│ ├─ Vendor ID lookup: Vendor::where('user_id', $user->id)        │
│ └─ Query filtering applied                                       │
│                                                                   │
│ Layer 4: Database Constraints                                    │
│ ├─ Foreign keys: vendor_id REFERENCES vendors(id)               │
│ ├─ Cascade deletes: ON DELETE CASCADE                           │
│ └─ Data integrity enforced                                       │
│                                                                   │
│ Layer 5: Query-Level Filtering                                   │
│ ├─ WHERE vendor_id = {vendorId}                                  │
│ ├─ Automatic in all queries                                      │
│ └─ No way to bypass                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Shopify Integration Flow for Vendors

```
┌─────────────────────────────────────────────────────────────────┐
│ Vendor logs in → Goes to API Integrations                       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend loads: GET /api/api-integrations                       │
│                                                                   │
│ Backend (ApiIntegrationController):                             │
│ if ($user->role->slug === 'vendor') {                           │
│     $vendor = Vendor::where('user_id', $user->id)->first();     │
│     $query->where('type', 'shopify')                            │
│           ->where(function($q) use ($vendor) {                  │
│               $q->where('vendor_id', $vendor->id)               │
│                 ->orWhereNull('vendor_id');                     │
│           });                                                     │
│ }                                                                 │
│                                                                   │
│ Returns: [                                                        │
│   {                                                               │
│     "id": 1,                                                      │
│     "name": "My Shopify Store",                                  │
│     "type": "shopify",                                           │
│     "vendor_id": 5,        ← Linked to this vendor               │
│     "credentials": { ... }                                        │
│   }                                                               │
│ ]                                                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Vendor sees:                                                     │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 🛍️ Shopify Integration                                     │   │
│ │                                                             │   │
│ │ Store: yourstore.myshopify.com                             │   │
│ │ Status: ✅ Connected                                        │   │
│ │                                                             │   │
│ │ [Sync Orders] [Configure] [Test Connection]               │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ❌ Tawsilex - Hidden                                             │
│ ❌ BMDelivery - Hidden                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Summary

### Key Architectural Decisions

1. **Role-Based Filtering**
   - Every query checks user role
   - Vendor ID obtained from `users.id` → `vendors.user_id`
   - All data filtered at query level

2. **Database Design**
   - `vendors.user_id` links vendor to authentication
   - `orders.vendor_id` links orders to vendor
   - `api_integrations.vendor_id` links Shopify to vendor
   - `marketplace_products` pivot links products to vendor

3. **Frontend Protection**
   - Menu items conditionally rendered
   - Admin-only items hidden via `adminOnly` flag
   - API integrations filtered by role

4. **Security by Default**
   - No way to bypass filtering
   - Backend enforces all rules
   - Frontend just hides UI elements

5. **Scalability**
   - Easy to add more vendor-specific features
   - Can create vendor-specific reports
   - Can add more integrations per vendor

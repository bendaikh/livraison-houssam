# API Documentation

## Base URL
```
http://localhost:8000/api
```

## Authentication

All protected endpoints require authentication using Bearer token.

### Headers
```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer {your_token}
```

---

## Authentication API

### Login
```http
POST /api/login
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "role": {
      "id": 1,
      "name": "Admin",
      "slug": "admin"
    }
  },
  "token": "1|abc123..."
}
```

### Logout
```http
POST /api/logout
```
Requires authentication.

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

### Get Current User
```http
GET /api/me
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Admin User",
  "email": "admin@example.com",
  "role": { ... }
}
```

---

## Dashboard API

### Get Statistics
```http
GET /api/dashboard?period={daily|monthly|yearly}
```

**Query Parameters:**
- `period` (optional): daily, monthly, yearly (default: daily)

**Response (200 OK):**
```json
{
  "sales": 15000.50,
  "orders": {
    "total": 150,
    "pending": 10,
    "confirmed": 50,
    "shipped": 40,
    "delivered": 45,
    "cancelled": 5
  },
  "revenue": {
    "revenue": 50000,
    "expenses": 15000,
    "profit": 35000
  },
  "low_stock_products": [...],
  "recent_orders": [...],
  "charts": [...]
}
```

---

## Products API

### List Products
```http
GET /api/products
```

**Query Parameters:**
- `search` (optional): Search by name or SKU
- `category_id` (optional): Filter by category
- `vendor_id` (optional): Filter by vendor
- `is_active` (optional): Filter by status
- `low_stock` (optional): Show only low stock items
- `per_page` (optional): Items per page (default: 15)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Product Name",
      "sku": "SKU123",
      "price": "99.99",
      "stock_quantity": 50,
      "is_active": true,
      "category": { ... },
      "vendor": { ... }
    }
  ],
  "meta": { ... }
}
```

### Create Product
```http
POST /api/products
```

**Request Body:**
```json
{
  "name": "New Product",
  "sku": "SKU123",
  "description": "Product description",
  "category_id": 1,
  "vendor_id": 1,
  "price": 99.99,
  "cost_price": 50.00,
  "stock_quantity": 100,
  "min_stock_quantity": 10,
  "is_active": true,
  "weight": 1.5,
  "weight_unit": "kg"
}
```

### Get Product
```http
GET /api/products/{id}
```

### Update Product
```http
PUT /api/products/{id}
```

### Delete Product
```http
DELETE /api/products/{id}
```

### Delete Product Image
```http
DELETE /api/products/{id}/images
```

**Request Body:**
```json
{
  "image_path": "products/image.jpg"
}
```

---

## Orders API

### List Orders
```http
GET /api/orders
```

**Query Parameters:**
- `search` (optional): Search by order number or client
- `status` (optional): Filter by status
- `source` (optional): Filter by source
- `vendor_id` (optional): Filter by vendor
- `delivery_agent_id` (optional): Filter by agent
- `date_from` (optional): Filter by date
- `date_to` (optional): Filter by date
- `per_page` (optional): Items per page

### Create Order
```http
POST /api/orders
```

**Request Body:**
```json
{
  "client_id": 1,
  "vendor_id": 1,
  "delivery_agent_id": 2,
  "source": "manual",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": 99.99
    }
  ],
  "shipping_cost": 30.00,
  "tax": 20.00,
  "discount": 10.00,
  "shipping_address": "123 Main St",
  "notes": "Special instructions"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "order_number": "ORD-ABC123",
  "total": 239.98,
  "status": "pending",
  "client": { ... },
  "items": [ ... ]
}
```

### Update Order Status
```http
PATCH /api/orders/{id}/status
```

**Request Body:**
```json
{
  "status": "confirmed",
  "note": "Order confirmed and ready for processing"
}
```

**Status Values:**
- `pending`
- `confirmed`
- `shipped`
- `delivered`
- `cancelled`

### Assign Delivery Agent
```http
PATCH /api/orders/{id}/assign-agent
```

**Request Body:**
```json
{
  "delivery_agent_id": 3
}
```

---

## Stock API

### Add Stock
```http
POST /api/stock/add
```

**Request Body:**
```json
{
  "product_id": 1,
  "quantity": 50,
  "unit_cost": 45.00,
  "note": "Restocking from supplier",
  "reference": "PO-2024-001"
}
```

### Remove Stock
```http
POST /api/stock/remove
```

**Request Body:**
```json
{
  "product_id": 1,
  "quantity": 10,
  "note": "Damaged items",
  "reference": "ADJ-2024-001"
}
```

### Adjust Stock
```http
POST /api/stock/adjust
```

**Request Body:**
```json
{
  "product_id": 1,
  "new_quantity": 100,
  "note": "Annual inventory adjustment"
}
```

### Get Stock History
```http
GET /api/stock/history?product_id={id}&type={in|out|adjustment}
```

### Get Low Stock Products
```http
GET /api/stock/low-stock
```

---

## Clients API

### List Clients
```http
GET /api/clients?search={term}&is_active={true|false}
```

### Create Client
```http
POST /api/clients
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+212600000000",
  "address": "123 Main St",
  "city": "Casablanca",
  "state": "Grand Casablanca",
  "postal_code": "20000",
  "is_active": true,
  "notes": "VIP customer"
}
```

---

## Vendors API

### List Vendors
```http
GET /api/vendors
```

### Create Vendor
```http
POST /api/vendors
```

**Request Body:**
```json
{
  "name": "Vendor Name",
  "email": "vendor@example.com",
  "phone": "+212600000000",
  "company_name": "Company LLC",
  "commission_rate": 10.00,
  "is_active": true
}
```

### Get Vendor Sales Report
```http
GET /api/vendors/{id}/sales-report?date_from=2024-01-01&date_to=2024-12-31
```

**Response:**
```json
{
  "vendor": { ... },
  "total_orders": 50,
  "total_sales": 50000.00,
  "total_commission": 5000.00,
  "net_revenue": 45000.00,
  "orders": [ ... ]
}
```

---

## Expenses API

### List Expenses
```http
GET /api/expenses?category_id={id}&date_from={date}&date_to={date}
```

### Create Expense
```http
POST /api/expenses
```

**Request Body (multipart/form-data):**
```
expense_category_id: 1
amount: 500.00
expense_date: 2024-01-15
description: Office rent
receipt: [file]
```

### Get Expense Report
```http
GET /api/expenses-report?date_from=2024-01-01&date_to=2024-12-31
```

---

## API Integrations

### List Integrations
```http
GET /api/api-integrations
```

### Create Integration
```http
POST /api/api-integrations
```

**Request Body (Shopify):**
```json
{
  "name": "My Shopify Store",
  "type": "shopify",
  "is_active": true,
  "credentials": {
    "shop_url": "https://mystore.myshopify.com",
    "access_token": "shpat_xxxxx"
  }
}
```

**Request Body (Delivery Company):**
```json
{
  "name": "Delivery Company",
  "type": "delivery",
  "is_active": true,
  "credentials": {
    "api_url": "https://api.delivery.com",
    "api_key": "your_api_key"
  }
}
```

### Sync Orders
```http
POST /api/api-integrations/{id}/sync
```

**Response:**
```json
{
  "message": "Sync completed",
  "log": {
    "status": "success",
    "total_records": 25,
    "successful_records": 24,
    "failed_records": 1
  }
}
```

---

## Settings API

### Get Settings
```http
GET /api/settings?group={general|company|delivery|commission|notification}
```

### Update Settings
```http
PUT /api/settings
```

**Request Body:**
```json
{
  "settings": {
    "company_name": "My Company",
    "currency": "MAD",
    "default_commission_rate": 10
  }
}
```

---

## Notifications API

### List Notifications
```http
GET /api/notifications?is_read={true|false}&type={low_stock|order_status_change}
```

### Get Unread Count
```http
GET /api/notifications/unread-count
```

**Response:**
```json
{
  "count": 5
}
```

### Mark As Read
```http
PATCH /api/notifications/{id}/read
```

### Mark All As Read
```http
POST /api/notifications/mark-all-read
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Validation error",
  "errors": {
    "email": ["The email field is required."]
  }
}
```

### 401 Unauthorized
```json
{
  "message": "Unauthenticated"
}
```

### 403 Forbidden
```json
{
  "message": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### 500 Server Error
```json
{
  "message": "Server error"
}
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **Authentication endpoints**: 5 requests per minute
- **Other endpoints**: 60 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
```

---

## Postman Collection

Import the Postman collection for easy API testing:
1. Open Postman
2. Import > Link
3. Paste: `http://localhost:8000/api/documentation.json`

---

## Support

For API support, contact: api-support@example.com

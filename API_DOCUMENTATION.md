# API Documentation

## Base URL
```
http://your-domain.com/api
```

## Authentication
All protected endpoints require authentication using Laravel Sanctum.

Include the token in the Authorization header:
```
Authorization: Bearer {token}
```

## Authentication Endpoints

### Login
```http
POST /login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "User Name",
    "email": "user@example.com",
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
POST /logout
```

**Headers:** Requires authentication

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### Get Current User
```http
GET /me
```

**Headers:** Requires authentication

**Response:**
```json
{
  "id": 1,
  "name": "User Name",
  "email": "user@example.com",
  "role": {
    "id": 1,
    "name": "Admin",
    "slug": "admin",
    "permissions": ["manage_products", "manage_orders"]
  }
}
```

## User Management Endpoints

### List Users
```http
GET /users
```

**Query Parameters:**
- `search` (string): Search by name or email
- `role_id` (integer): Filter by role
- `is_active` (boolean): Filter by status
- `per_page` (integer): Items per page (default: 15)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "User Name",
      "email": "user@example.com",
      "phone": "+212 600 000 000",
      "address": "Address",
      "is_active": true,
      "role": {
        "id": 1,
        "name": "Admin",
        "slug": "admin"
      }
    }
  ],
  "current_page": 1,
  "total": 10
}
```

### Create User
```http
POST /users
```

**Request Body:**
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123",
  "role_id": 1,
  "phone": "+212 600 000 000",
  "address": "User Address",
  "is_active": true
}
```

### Update User
```http
PUT /users/{id}
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "password": "newpassword",
  "role_id": 2,
  "phone": "+212 600 000 001",
  "address": "New Address",
  "is_active": false
}
```

### Delete User
```http
DELETE /users/{id}
```

### Get Delivery Agents
```http
GET /delivery-agents
```

**Response:**
```json
[
  {
    "id": 4,
    "name": "Delivery Agent",
    "email": "delivery@example.com",
    "role": {
      "name": "Agent Livraison",
      "slug": "agent_livraison"
    }
  }
]
```

### Get Confirmation Agents
```http
GET /confirmation-agents
```

**Response:**
```json
[
  {
    "id": 3,
    "name": "Confirmation Agent",
    "email": "confirmation@example.com",
    "role": {
      "name": "Agent Confirmation",
      "slug": "agent_confirmation"
    }
  }
]
```

## Product Management Endpoints

### List Products
```http
GET /products
```

**Query Parameters:**
- `search` (string): Search by name or SKU
- `category_id` (integer): Filter by category
- `vendor_id` (integer): Filter by vendor
- `is_active` (boolean): Filter by status
- `low_stock` (boolean): Show only low stock items
- `per_page` (integer): Items per page

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Product Name",
      "sku": "SKU-001",
      "description": "Product description",
      "price": 100.00,
      "company_price": 90.00,
      "vendor_price": 80.00,
      "cost_price": 70.00,
      "stock_quantity": 50,
      "min_stock_quantity": 10,
      "is_active": true,
      "images": ["products/image1.jpg"],
      "weight": 1.5,
      "weight_unit": "kg",
      "category": {
        "id": 1,
        "name": "Electronics"
      },
      "vendor": {
        "id": 1,
        "name": "Vendor Name"
      }
    }
  ]
}
```

### Create Product
```http
POST /products
```

**Content-Type:** multipart/form-data

**Form Data:**
- `name` (required)
- `sku` (required, unique)
- `description`
- `category_id`
- `vendor_id`
- `price` (required)
- `company_price`
- `vendor_price`
- `cost_price`
- `stock_quantity` (required)
- `min_stock_quantity` (required)
- `is_active` (boolean)
- `weight`
- `weight_unit`
- `images[]` (array of files)

### Update Product
```http
PUT /products/{id}
```

**Content-Type:** multipart/form-data

### Delete Product
```http
DELETE /products/{id}
```

### Delete Product Image
```http
DELETE /products/{id}/images
```

**Request Body:**
```json
{
  "image_path": "products/image1.jpg"
}
```

## Order Management Endpoints

### List Orders
```http
GET /orders
```

**Query Parameters:**
- `search` (string): Search by order number or client
- `status` (string): pending, confirmed, shipped, delivered, cancelled
- `source` (string): manual, shopify, delivery_company, marketplace
- `vendor_id` (integer)
- `delivery_agent_id` (integer)
- `confirmation_agent_id` (integer)
- `date_from` (date)
- `date_to` (date)
- `per_page` (integer)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "order_number": "ORD-ABC123",
      "status": "pending",
      "source": "manual",
      "subtotal": 200.00,
      "shipping_cost": 30.00,
      "tax": 20.00,
      "discount": 0.00,
      "total": 250.00,
      "shipping_address": "Client Address",
      "notes": "Special instructions",
      "whatsapp": "+212 600 000 000",
      "created_at": "2024-01-15T10:30:00",
      "client": {
        "id": 1,
        "name": "Client Name",
        "phone": "+212 600 000 000",
        "city": "Casablanca"
      },
      "vendor": {
        "id": 1,
        "name": "Vendor Name"
      },
      "delivery_agent": {
        "id": 4,
        "name": "Delivery Agent"
      },
      "confirmation_agent": {
        "id": 3,
        "name": "Confirmation Agent"
      },
      "items": [
        {
          "id": 1,
          "product_id": 1,
          "quantity": 2,
          "price": 100.00,
          "product": {
            "id": 1,
            "name": "Product Name",
            "sku": "SKU-001"
          }
        }
      ]
    }
  ]
}
```

### Create Order
```http
POST /orders
```

**Request Body:**
```json
{
  "client_id": 1,
  "vendor_id": 1,
  "delivery_agent_id": 4,
  "confirmation_agent_id": 3,
  "source": "manual",
  "shipping_address": "Delivery Address",
  "notes": "Order notes",
  "whatsapp": "+212 600 000 000",
  "shipping_cost": 30.00,
  "tax": 20.00,
  "discount": 0.00,
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": 100.00
    },
    {
      "product_id": 2,
      "quantity": 1,
      "price": 50.00
    }
  ]
}
```

### Get Order Details
```http
GET /orders/{id}
```

### Update Order Status
```http
PATCH /orders/{id}/status
```

**Request Body:**
```json
{
  "status": "confirmed",
  "note": "Order confirmed by agent"
}
```

**Valid Statuses:**
- `pending`
- `confirmed`
- `shipped`
- `delivered`
- `cancelled`

### Assign Delivery Agent
```http
PATCH /orders/{id}/assign-agent
```

**Request Body:**
```json
{
  "delivery_agent_id": 4
}
```

### Delete Order
```http
DELETE /orders/{id}
```

## Role Management Endpoints

### List Roles
```http
GET /roles
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Super Admin",
    "slug": "superadmin",
    "description": "Supreme administrator with all permissions",
    "permissions": [
      "manage_products",
      "manage_orders",
      "manage_users",
      "access_everything"
    ]
  }
]
```

### Create Role
```http
POST /roles
```

**Request Body:**
```json
{
  "name": "Custom Role",
  "slug": "custom_role",
  "description": "Custom role description",
  "permissions": [
    "view_orders",
    "view_products"
  ]
}
```

### Update Role
```http
PUT /roles/{id}
```

### Delete Role
```http
DELETE /roles/{id}
```

## Client Management Endpoints

### List Clients
```http
GET /clients
```

**Query Parameters:**
- `search` (string)
- `city` (string)
- `per_page` (integer)

### Create Client
```http
POST /clients
```

**Request Body:**
```json
{
  "name": "Client Name",
  "phone": "+212 600 000 000",
  "email": "client@example.com",
  "address": "Client Address",
  "city": "Casablanca",
  "notes": "Client notes"
}
```

## Vendor Management Endpoints

### List Vendors
```http
GET /vendors
```

### Create Vendor
```http
POST /vendors
```

**Request Body:**
```json
{
  "name": "Vendor Name",
  "company_name": "Company Name",
  "phone": "+212 600 000 000",
  "email": "vendor@example.com",
  "address": "Vendor Address",
  "commission_rate": 10.00,
  "is_active": true
}
```

## Category Management Endpoints

### List Categories
```http
GET /categories
```

### Create Category
```http
POST /categories
```

**Request Body:**
```json
{
  "name": "Category Name",
  "slug": "category-slug",
  "description": "Category description",
  "is_active": true,
  "sort_order": 1
}
```

## Dashboard Endpoint

### Get Dashboard Data
```http
GET /dashboard
```

**Response:**
```json
{
  "total_orders": 150,
  "pending_orders": 25,
  "total_revenue": 50000.00,
  "low_stock_products": 5,
  "recent_orders": [],
  "top_products": [],
  "revenue_chart": []
}
```

## Error Responses

### Validation Error (422)
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email field is required."],
    "password": ["The password must be at least 8 characters."]
  }
}
```

### Unauthorized (401)
```json
{
  "message": "Unauthenticated."
}
```

### Forbidden (403)
```json
{
  "message": "This action is unauthorized."
}
```

### Not Found (404)
```json
{
  "message": "Resource not found."
}
```

### Server Error (500)
```json
{
  "message": "Server Error"
}
```

## Rate Limiting

API requests are rate-limited to:
- 60 requests per minute for authenticated users
- 10 requests per minute for unauthenticated users

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
```

## Pagination

Paginated responses include:
```json
{
  "data": [],
  "current_page": 1,
  "per_page": 15,
  "total": 100,
  "last_page": 7,
  "from": 1,
  "to": 15
}
```

## Best Practices

1. **Always validate input** on the client side before sending
2. **Handle errors gracefully** and show user-friendly messages
3. **Use appropriate HTTP methods** (GET, POST, PUT, DELETE)
4. **Include authentication token** in all protected requests
5. **Check rate limits** and implement retry logic
6. **Cache responses** when appropriate
7. **Use pagination** for large datasets
8. **Sanitize user input** before sending to API

## Testing with cURL

### Login Example
```bash
curl -X POST http://your-domain.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

### Authenticated Request Example
```bash
curl -X GET http://your-domain.com/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

### Create Product Example
```bash
curl -X POST http://your-domain.com/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "name=Product Name" \
  -F "sku=SKU-001" \
  -F "price=100" \
  -F "stock_quantity=50" \
  -F "min_stock_quantity=10" \
  -F "images[]=@/path/to/image.jpg"
```

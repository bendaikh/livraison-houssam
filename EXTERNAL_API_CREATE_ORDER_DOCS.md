# External API - Create Order Documentation

## ✅ Authentication Working!

Good news: Authentication is now working. The 422 error means you're authenticated but sending incomplete data.

## 🔑 Current API Key

```
capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0
```

## 📋 Create Order Endpoint

### Endpoint
```
POST https://smanager.site/api/orders
```

### Headers (Required)
```
Authorization: Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0
Content-Type: application/json
Accept: application/json
```

### Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `client_name` | string | **YES** (unless client_id provided) | Customer name |
| `client_phone` | string | **YES** | Customer phone (will be normalized) |
| `source` | string | **YES** | Must be one of: `manual`, `shopify`, `google_sheet`, `delivery_company`, `marketplace`, `whatsapp` |
| `items` | array | **YES** | Array of order items (minimum 1) |
| `items[].product_id` | integer | **YES** | Product ID (must exist in products table) |
| `items[].quantity` | integer | **YES** | Quantity (minimum 1) |
| `items[].price` | number | **YES** | Price per unit |

### Optional Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `client_id` | integer | NO | Existing client ID (if provided, client_name not required) |
| `vendor_id` | integer | NO | Vendor ID |
| `delivery_agent_id` | integer | NO | Delivery agent user ID |
| `delivery_integration_id` | integer | NO | Delivery company integration ID |
| `delivery_person_id` | integer | NO | Delivery person user ID |
| `confirmation_agent_id` | integer | NO | Confirmation agent user ID |
| `callback_date` | date | NO | Callback date |
| `delivery_city` | string | NO | Delivery city |
| `status` | string | NO | Order status (default: `pending`) |
| `items[].is_upsell` | boolean | NO | Is this item an upsell? |
| `shipping_cost` | number | NO | Shipping cost |
| `shipping_cost_source` | string | NO | `auto` or `manual` |
| `shipping_included_in_price` | boolean | NO | Is shipping included in price? |
| `tax` | number | NO | Tax amount |
| `discount` | number | NO | Discount amount |
| `shipping_address` | string | NO | Full shipping address |
| `city` | string | NO | City |
| `notes` | string | NO | Order notes |
| `whatsapp` | string | NO | WhatsApp number |

### Valid Status Values
- `pending` (default)
- `confirmed`
- `reported`
- `picked_up`
- `ready_for_shipping`
- `shipped`
- `out_for_delivery`
- `delivered`
- `cancelled`
- `refused`
- `returned`
- `no_response`
- `return_requested`

### Valid Source Values (REQUIRED!)
- `manual` - Manually created order
- `shopify` - From Shopify integration
- `google_sheet` - From Google Sheets
- `delivery_company` - From delivery company
- `marketplace` - From marketplace
- `whatsapp` - From WhatsApp

## 📝 Example Request

### Minimum Required Fields

```json
{
  "client_name": "John Doe",
  "client_phone": "0612345678",
  "source": "whatsapp",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": 100
    }
  ]
}
```

### Full Example with Optional Fields

```json
{
  "client_name": "John Doe",
  "client_phone": "0612345678",
  "source": "whatsapp",
  "client_address": "123 Main Street, Apartment 4B",
  "city": "Casablanca",
  "delivery_city": "Casablanca",
  "notes": "Please call before delivery",
  "whatsapp": "0612345678",
  "shipping_cost": 30,
  "tax": 0,
  "discount": 10,
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": 100,
      "is_upsell": false
    },
    {
      "product_id": 3,
      "quantity": 1,
      "price": 50,
      "is_upsell": true
    }
  ]
}
```

## 🧪 cURL Example

```bash
curl -X POST https://smanager.site/api/orders \
  -H "Authorization: Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "client_name": "John Doe",
    "client_phone": "0612345678",
    "source": "whatsapp",
    "items": [
      {
        "product_id": 1,
        "quantity": 2,
        "price": 100
      }
    ]
  }'
```

## 🐍 Python Example

```python
import requests

url = "https://smanager.site/api/orders"
headers = {
    "Authorization": "Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0",
    "Content-Type": "application/json",
    "Accept": "application/json"
}
data = {
    "client_name": "John Doe",
    "client_phone": "0612345678",
    "source": "whatsapp",
    "items": [
        {
            "product_id": 1,
            "quantity": 2,
            "price": 100
        }
    ]
}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```

## 💻 JavaScript Example

```javascript
const response = await fetch('https://smanager.site/api/orders', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0',
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({
    client_name: 'John Doe',
    client_phone: '0612345678',
    source: 'whatsapp',
    items: [
      {
        product_id: 1,
        quantity: 2,
        price: 100
      }
    ]
  })
});

const order = await response.json();
console.log(order);
```

## 🔧 PHP Example

```php
<?php
$url = "https://smanager.site/api/orders";
$headers = [
    "Authorization: Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0",
    "Content-Type: application/json",
    "Accept: application/json"
];
$data = [
    "client_name" => "John Doe",
    "client_phone" => "0612345678",
    "source" => "whatsapp",
    "items" => [
        [
            "product_id" => 1,
            "quantity" => 2,
            "price" => 100
        ]
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$order = json_decode($response, true);
curl_close($ch);

print_r($order);
?>
```

## ✅ Success Response (201 Created)

```json
{
  "id": 76,
  "order_number": "ORD-69D45736BAD31",
  "client_id": 89,
  "vendor_id": null,
  "status": "pending",
  "source": "whatsapp",
  "subtotal": "200.00",
  "shipping_cost": "35.00",
  "tax": "0.00",
  "discount": "0.00",
  "total": "235.00",
  "client": {
    "id": 89,
    "name": "John Doe",
    "phone": "0612345678",
    "address": null,
    "city": null
  },
  "items": [
    {
      "id": 8,
      "product_id": 1,
      "quantity": 2,
      "price": "100.00",
      "subtotal": "200.00",
      "is_upsell": false,
      "product": {
        "id": 1,
        "name": "Product Name",
        "sku": "SKU-001",
        "price": "120.00"
      }
    }
  ],
  "created_at": "2026-04-07T01:00:00.000000Z",
  "updated_at": "2026-04-07T01:00:00.000000Z"
}
```

## ❌ Error Response (422 Validation Error)

```json
{
  "message": "The client name field is required when client id is not present. (and 3 more errors)",
  "errors": {
    "client_name": [
      "The client name field is required when client id is not present."
    ],
    "client_phone": [
      "The client phone field is required."
    ],
    "source": [
      "The selected source is invalid."
    ],
    "items": [
      "The items field is required."
    ]
  }
}
```

## 🚨 Common Errors and Solutions

### Error: "The client name field is required"
**Solution:** Add `"client_name": "Customer Name"` to your request

### Error: "The client phone field is required"
**Solution:** Add `"client_phone": "0612345678"` to your request

### Error: "The selected source is invalid"
**Solution:** Make sure `source` is one of: `manual`, `shopify`, `google_sheet`, `delivery_company`, `marketplace`, `whatsapp`

**Recommended for external apps:** Use `"source": "whatsapp"` or `"source": "marketplace"`

### Error: "The items field is required"
**Solution:** Add `"items": [...]` array with at least one item

### Error: "The items.0.product_id field is required"
**Solution:** Each item must have `product_id`, `quantity`, and `price`

### Error: "The selected items.0.product_id is invalid"
**Solution:** The product_id must exist in your products table. Check available products first.

## 📌 Notes

1. **Phone Normalization**: Phone numbers are automatically normalized to Moroccan format
2. **Client Auto-Creation**: If `client_id` is not provided, a client will be created/found by name and phone
3. **Default Status**: Orders are created with `pending` status by default
4. **Shipping Cost**: If not provided, will be calculated automatically based on city
5. **Source Field**: This is **REQUIRED** - choose the most appropriate value for your integration

## 🔍 Get List of Products

To get available products for order creation:

```bash
curl -X GET https://smanager.site/api/external/products \
  -H "Authorization: Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0" \
  -H "Accept: application/json"
```

## 📊 Check Order Status

```bash
curl -X GET https://smanager.site/api/orders/{order_id} \
  -H "Authorization: Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0" \
  -H "Accept: application/json"
```

---

**Last Updated:** April 7, 2026  
**API Version:** 1.0  
**Authentication:** Custom API Key (Bearer Token)

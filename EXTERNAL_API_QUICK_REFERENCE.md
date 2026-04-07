# Quick Reference - External API Integration

## Base URL
```
Production: https://smanager.site/api
Local: http://localhost:9500/api
```

## Authentication
All requests must include the Authorization header:
```
Authorization: Bearer capi_d4cd70450ca2182999b050614cf71b2425210a579a136681906bb2e42ba10034
```

## Headers
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
Accept: application/json
```

## Quick Test
```bash
# Test if your API key works
curl -X GET https://smanager.site/api/test-auth \
  -H "Authorization: Bearer capi_d4cd70450ca2182999b050614cf71b2425210a579a136681906bb2e42ba10034" \
  -H "Accept: application/json"
```

## Create Order
```bash
curl -X POST https://smanager.site/api/orders \
  -H "Authorization: Bearer capi_d4cd70450ca2182999b050614cf71b2425210a579a136681906bb2e42ba10034" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "client_name": "John Doe",
    "client_phone": "0612345678",
    "client_address": "123 Main St",
    "client_city": "Casablanca",
    "items": [
      {
        "product_id": 1,
        "quantity": 2,
        "price": 100
      }
    ]
  }'
```

## List Orders
```bash
curl -X GET https://smanager.site/api/orders \
  -H "Authorization: Bearer capi_d4cd70450ca2182999b050614cf71b2425210a579a136681906bb2e42ba10034" \
  -H "Accept: application/json"
```

## Get Order Details
```bash
curl -X GET https://smanager.site/api/orders/{order_id} \
  -H "Authorization: Bearer capi_d4cd70450ca2182999b050614cf71b2425210a579a136681906bb2e42ba10034" \
  -H "Accept: application/json"
```

## Update Order Status
```bash
curl -X PATCH https://smanager.site/api/orders/{order_id}/status \
  -H "Authorization: Bearer capi_d4cd70450ca2182999b050614cf71b2425210a579a136681906bb2e42ba10034" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "status": "confirmed"
  }'
```

## Available Statuses
- `pending` - Initial status
- `confirmed` - Order confirmed
- `preparing` - Being prepared
- `ready_for_shipping` - Ready to ship
- `shipped` - Shipped
- `out_for_delivery` - Out for delivery
- `delivered` - Delivered successfully
- `cancelled` - Cancelled
- `refused` - Customer refused
- `returned` - Returned
- `no_response` - Customer didn't respond

## Response Format

### Success (200/201)
```json
{
  "id": 75,
  "order_number": "ORD-69D4513F1FAF6",
  "status": "pending",
  "client": {
    "id": 88,
    "name": "Test Client",
    "phone": "0612345678"
  },
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": "100.00",
      "subtotal": "200.00"
    }
  ],
  "total": "235.00"
}
```

### Error (401)
```json
{
  "message": "Unauthenticated. API key is required."
}
```

### Error (400/422)
```json
{
  "message": "Validation error",
  "errors": {
    "client_name": ["The client name field is required."]
  }
}
```

## Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/test-auth` | Test authentication |
| POST | `/orders` | Create order |
| GET | `/orders` | List orders |
| GET | `/orders/{id}` | Get order |
| PATCH | `/orders/{id}` | Update order |
| PATCH | `/orders/{id}/status` | Update status |
| GET | `/external/products` | List products |
| GET | `/external/products/{id}` | Get product |
| GET | `/external/clients` | List clients |
| POST | `/external/clients` | Create client |

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized (invalid/missing API key) |
| 403 | Forbidden (no permission) |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Server Error |

## Support

If you encounter any issues:
1. Check your API key is correct
2. Verify all required headers are present
3. Test with `/api/test-auth` endpoint first
4. Contact the API administrator for assistance

---

**API Version**: 1.0  
**Last Updated**: April 7, 2026

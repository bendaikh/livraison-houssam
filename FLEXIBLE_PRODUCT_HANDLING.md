# ✅ FLEXIBLE PRODUCT HANDLING - IMPLEMENTED!

## What Changed

Your API now accepts orders **WITHOUT requiring product_id**! External apps can send:
- `product_name` (product name)
- `sku` (product SKU)
- Or both

The system will automatically:
1. Try to find the product by SKU (most accurate)
2. If not found, try to find by name (fuzzy match)
3. If still not found, create/use an "Unknown Product" placeholder

## 📋 New Request Formats

### Option 1: With product_id (existing behavior)
```json
{
  "client_name": "John Doe",
  "client_phone": "0612345678",
  "source": "whatsapp",
  "items": [{
    "product_id": 5,
    "quantity": 2,
    "price": 150
  }]
}
```

### Option 2: With product_name (NEW!)
```json
{
  "client_name": "John Doe",
  "client_phone": "0612345678",
  "source": "whatsapp",
  "items": [{
    "product_name": "iPhone 15 Pro",
    "quantity": 1,
    "price": 12000
  }]
}
```

### Option 3: With SKU (NEW!)
```json
{
  "client_name": "John Doe",
  "client_phone": "0612345678",
  "source": "whatsapp",
  "items": [{
    "sku": "IPHONE15-PRO-256",
    "quantity": 1,
    "price": 12000
  }]
}
```

### Option 4: With product_name AND sku (BEST!)
```json
{
  "client_name": "John Doe",
  "client_phone": "0612345678",
  "source": "whatsapp",
  "items": [{
    "product_name": "iPhone 15 Pro 256GB",
    "sku": "IPHONE15-PRO-256",
    "quantity": 1,
    "price": 12000
  }]
}
```

## 🔍 How Product Resolution Works

### Priority Order:
1. **product_id** provided → Use it directly (skip resolution)
2. **sku** provided → Find product by SKU
3. **product_name** provided → Find product by name (fuzzy match with LIKE)
4. **Nothing found** → Create/use "Unknown Product" placeholder

### Example Resolution Flow:

```
Request: { "product_name": "iPhone 15", "sku": "IP15", "price": 12000 }

Step 1: Check if product_id exists → NO
Step 2: Check SKU "IP15" → Found Product ID 5
Step 3: Use Product ID 5 for this item ✅

Final Item: { "product_id": 5, "product_name": "iPhone 15", "sku": "IP15", "price": 12000 }
```

## 📊 Updated API Documentation

### Request Body Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `items[].product_id` | integer | **NO** | Product ID (if not provided, will be resolved) |
| `items[].product_name` | string | **NO** | Product name (used to find product if no product_id) |
| `items[].sku` | string | **NO** | Product SKU (used to find product if no product_id) |
| `items[].quantity` | integer | **YES** | Quantity |
| `items[].price` | number | **YES** | Price per unit |
| `items[].is_upsell` | boolean | NO | Is this an upsell item? |

**Note**: At least ONE of `product_id`, `product_name`, or `sku` should be provided per item.

## 🧪 Test Examples

### Test 1: Product Name Only
```bash
curl -X POST https://smanager.site/api/orders \
  -H "Authorization: Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test Customer",
    "client_phone": "0612345678",
    "source": "whatsapp",
    "items": [{
      "product_name": "Test Product",
      "quantity": 1,
      "price": 100
    }]
  }'
```

### Test 2: SKU Only
```bash
curl -X POST https://smanager.site/api/orders \
  -H "Authorization: Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test Customer",
    "client_phone": "0612345678",
    "source": "whatsapp",
    "items": [{
      "sku": "PROD-001",
      "quantity": 2,
      "price": 150
    }]
  }'
```

### Test 3: Product Name + SKU (Recommended)
```bash
curl -X POST https://smanager.site/api/orders \
  -H "Authorization: Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test Customer",
    "client_phone": "0612345678",
    "source": "whatsapp",
    "items": [{
      "product_name": "Premium Widget",
      "sku": "WIDGET-PREM",
      "quantity": 1,
      "price": 500
    }]
  }'
```

## 🎯 Benefits for External Apps

1. **No Need to Sync Product IDs**: External apps don't need to maintain a mapping of product IDs
2. **Flexible Integration**: Send product names directly from lead forms
3. **Automatic Matching**: System finds the right product automatically
4. **Fallback Support**: Unknown products are handled gracefully
5. **Data Preservation**: Original product names are stored even when matched

## 🔄 Unknown Product Handling

If a product can't be found:
- A product with SKU "UNKNOWN" is created/used
- Original product_name is preserved in the order item
- You can later match unknown products to real products in the admin panel
- Stock is set to 999999 (won't run out)

## 📝 Recommended Usage for External Apps

**Best Practice**: Send BOTH product_name and SKU when available:

```javascript
const orderData = {
  client_name: lead.customer_name,
  client_phone: lead.phone,
  source: "whatsapp",
  items: [{
    product_name: lead.product_name,  // ← From your lead form
    sku: lead.product_sku,            // ← Optional, if available
    quantity: lead.quantity || 1,
    price: lead.price
  }]
};
```

This gives the best matching accuracy while preserving all product information!

## ⚠️ Important Notes

1. **Fuzzy Matching**: Product name matching uses LIKE, so "iPhone 15" will match "iPhone 15 Pro"
2. **Case Sensitive**: SKU matching is exact and case-sensitive
3. **First Match**: If multiple products match the name, the first one is used
4. **Price Flexibility**: The price in the request is always used (not the product's default price)

---

**Status**: ✅ IMPLEMENTED & READY  
**Date**: April 7, 2026  
**Backward Compatible**: YES (existing integrations with product_id still work)

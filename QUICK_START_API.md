# Quick Start Guide - API Integrations

## 🚀 Quick Setup

### 1. Shopify Integration

```bash
# Create integration via API
POST /api/api-integrations
{
  "name": "My Shopify Store",
  "type": "shopify",
  "provider": "shopify",
  "credentials": {
    "shop_url": "https://your-store.myshopify.com",
    "access_token": "shpat_xxxxx"
  }
}

# Sync orders
POST /api/api-integrations/{id}/sync
```

### 2. Tawsilex Integration

```bash
# Create integration via API
POST /api/api-integrations
{
  "name": "Tawsilex",
  "type": "delivery",
  "provider": "tawsilex",
  "credentials": {
    "api_token": "your-tawsilex-token"
  }
}

# Create shipment from order
POST /api/api-integrations/{id}/create-shipment
{
  "order_id": 123
}

# Track shipment
POST /api/api-integrations/{id}/track-shipment
{
  "tracking_code": "TWX123456"
}
```

### 3. BMDelivery Integration

```bash
# Create integration via API
POST /api/api-integrations
{
  "name": "BMDelivery",
  "type": "delivery",
  "provider": "bmdelivery",
  "credentials": {
    "api_token": "your-bmdelivery-token"
  }
}

# Get available cities
GET /api/api-integrations/{id}/cities

# Create shipment from order
POST /api/api-integrations/{id}/create-shipment
{
  "order_id": 456
}
```

---

## 📋 Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/api-integrations` | GET | List all integrations |
| `/api/api-integrations` | POST | Create integration |
| `/api/api-integrations/{id}` | GET | Get integration |
| `/api/api-integrations/{id}` | PUT | Update integration |
| `/api/api-integrations/{id}` | DELETE | Delete integration |
| `/api/api-integrations/{id}/sync` | POST | Sync orders/shipments |
| `/api/api-integrations/{id}/test-connection` | POST | Test connection |
| `/api/api-integrations/{id}/create-shipment` | POST | Create shipment |
| `/api/api-integrations/{id}/track-shipment` | POST | Track shipment |
| `/api/api-integrations/{id}/cities` | GET | Get cities (delivery) |
| `/api/api-integrations/{id}/statuses` | GET | Get statuses (delivery) |
| `/api/api-integrations/{id}/logs` | GET | Get sync logs |

---

## 🔑 Credentials Format

### Shopify
```json
{
  "shop_url": "https://your-store.myshopify.com",
  "access_token": "shpat_xxxxxxxxxxxxxxxxxxxxx"
}
```

### Tawsilex
```json
{
  "api_token": "your-tawsilex-api-token"
}
```

### BMDelivery
```json
{
  "api_token": "your-bmdelivery-api-token"
}
```

---

## 📦 Service Classes

- **ShopifyService**: `app/Services/ShopifyService.php`
- **TawsilexService**: `app/Services/TawsilexService.php`
- **BMDeliveryService**: `app/Services/BMDeliveryService.php`
- **ApiIntegrationService**: `app/Services/ApiIntegrationService.php`

---

## 🔗 External Documentation

- **Tawsilex API**: https://tawsilex.com/doc/api-client
- **BMDelivery API**: https://bmdelivery.ma/doc/api-client
- **Shopify API**: https://shopify.dev/docs/api

---

## ⚡ Common Operations

### Import Shopify Orders
```php
// In your code
$apiIntegrationService->syncShopifyOrders($integrationId);
```

### Create Delivery Shipment
```php
// In your code
$apiIntegrationService->createDeliveryShipment($orderId, $integrationId);
```

### Track Shipment
```php
// In your code
$apiIntegrationService->trackDeliveryShipment($trackingCode, $integrationId);
```

---

## 🛠️ Testing

```bash
# Test Shopify connection
POST /api/api-integrations/1/test-connection

# Test Tawsilex connection
POST /api/api-integrations/2/test-connection

# Test BMDelivery connection
POST /api/api-integrations/3/test-connection
```

---

For detailed documentation, see [API_INTEGRATIONS.md](./API_INTEGRATIONS.md)

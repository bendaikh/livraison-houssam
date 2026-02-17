# API Integrations Documentation

This document describes how to integrate and use the Shopify, Tawsilex, and BMDelivery APIs in the application.

## Table of Contents

1. [Overview](#overview)
2. [Shopify Integration](#shopify-integration)
3. [Tawsilex Integration](#tawsilex-integration)
4. [BMDelivery Integration](#bmdelivery-integration)
5. [API Endpoints](#api-endpoints)
6. [Usage Examples](#usage-examples)

---

## Overview

The application supports three types of API integrations:

- **Shopify**: E-commerce platform for importing orders
- **Tawsilex**: Moroccan delivery service for shipping management
- **BMDelivery**: Moroccan delivery service for shipping management

### Architecture

- **Services**: Each integration has a dedicated service class (`ShopifyService`, `TawsilexService`, `BMDeliveryService`)
- **Unified Interface**: `ApiIntegrationService` provides a unified interface for all integrations
- **Database**: Integrations are stored in the `api_integrations` table with credentials and settings

---

## Shopify Integration

### Setup

1. Create a Shopify private app or custom app
2. Get your Shop URL (e.g., `https://your-store.myshopify.com`)
3. Get your Admin API access token
4. Add credentials to your integration

### Credentials Format

```json
{
  "shop_url": "https://your-store.myshopify.com",
  "access_token": "shpat_xxxxxxxxxxxxxxxxxxxxx"
}
```

### Features

- Import orders from Shopify
- Sync order statuses
- Create fulfillments
- Update tracking information
- Sync products and inventory

### Creating a Shopify Integration

**POST** `/api/api-integrations`

```json
{
  "name": "My Shopify Store",
  "type": "shopify",
  "provider": "shopify",
  "is_active": true,
  "credentials": {
    "shop_url": "https://your-store.myshopify.com",
    "access_token": "shpat_xxxxxxxxxxxxxxxxxxxxx"
  }
}
```

### Syncing Orders

**POST** `/api/api-integrations/{id}/sync`

This will:
- Fetch all orders from Shopify
- Create or update orders in the system
- Create clients automatically
- Create products automatically
- Map Shopify statuses to internal statuses

---

## Tawsilex Integration

### Setup

1. Register at [tawsilex.com](https://tawsilex.com)
2. Get your API token from the back-office
3. Add credentials to your integration

### Credentials Format

```json
{
  "api_token": "your-tawsilex-api-token"
}
```

### Features

- Create shipments (colis)
- Track shipments
- List shipments
- List shipments for pickup (ramassage)
- Get available statuses
- Update shipment status
- Manage stock

### Creating a Tawsilex Integration

**POST** `/api/api-integrations`

```json
{
  "name": "Tawsilex",
  "type": "delivery",
  "provider": "tawsilex",
  "is_active": true,
  "credentials": {
    "api_token": "your-tawsilex-api-token"
  }
}
```

### Creating a Shipment

**POST** `/api/api-integrations/{id}/create-shipment`

```json
{
  "order_id": 123
}
```

This will automatically:
- Extract order details
- Create shipment in Tawsilex
- Update order with tracking code

### Tracking a Shipment

**POST** `/api/api-integrations/{id}/track-shipment`

```json
{
  "tracking_code": "TWX123456"
}
```

### Getting Statuses

**GET** `/api/api-integrations/{id}/statuses`

Returns list of available statuses from Tawsilex.

### API Documentation

Full Tawsilex API documentation: [https://tawsilex.com/doc/api-client](https://tawsilex.com/doc/api-client)

---

## BMDelivery Integration

### Setup

1. Register at [bmdelivery.ma](https://bmdelivery.ma)
2. Get your API token from the back-office
3. Add credentials to your integration

### Credentials Format

```json
{
  "api_token": "your-bmdelivery-api-token"
}
```

### Features

- Create shipments (colis)
- Track shipments
- List shipments
- List shipments for pickup (ramassage)
- Get available cities

### Creating a BMDelivery Integration

**POST** `/api/api-integrations`

```json
{
  "name": "BMDelivery",
  "type": "delivery",
  "provider": "bmdelivery",
  "is_active": true,
  "credentials": {
    "api_token": "your-bmdelivery-api-token"
  }
}
```

### Creating a Shipment

**POST** `/api/api-integrations/{id}/create-shipment`

```json
{
  "order_id": 123
}
```

### Tracking a Shipment

**POST** `/api/api-integrations/{id}/track-shipment`

```json
{
  "tracking_code": "BMD123456"
}
```

### Getting Cities

**GET** `/api/api-integrations/{id}/cities`

Returns list of available cities for delivery.

### API Documentation

Full BMDelivery API documentation: [https://bmdelivery.ma/doc/api-client](https://bmdelivery.ma/doc/api-client)

---

## API Endpoints

### Integration Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/api-integrations` | List all integrations |
| POST | `/api/api-integrations` | Create new integration |
| GET | `/api/api-integrations/{id}` | Get integration details |
| PUT | `/api/api-integrations/{id}` | Update integration |
| DELETE | `/api/api-integrations/{id}` | Delete integration |

### Integration Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/api-integrations/{id}/sync` | Sync orders/shipments |
| GET | `/api/api-integrations/{id}/logs` | Get sync logs |
| POST | `/api/api-integrations/{id}/test-connection` | Test API connection |
| POST | `/api/api-integrations/{id}/create-shipment` | Create shipment from order |
| POST | `/api/api-integrations/{id}/track-shipment` | Track shipment |
| GET | `/api/api-integrations/{id}/cities` | Get cities (delivery only) |
| GET | `/api/api-integrations/{id}/statuses` | Get statuses (delivery only) |

---

## Usage Examples

### Example 1: Complete Shopify Integration Flow

```bash
# 1. Create Shopify integration
curl -X POST http://localhost:8000/api/api-integrations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Store",
    "type": "shopify",
    "provider": "shopify",
    "credentials": {
      "shop_url": "https://mystore.myshopify.com",
      "access_token": "shpat_xxxxx"
    }
  }'

# 2. Test connection
curl -X POST http://localhost:8000/api/api-integrations/1/test-connection \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Sync orders
curl -X POST http://localhost:8000/api/api-integrations/1/sync \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Check sync logs
curl -X GET http://localhost:8000/api/api-integrations/1/logs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 2: Complete Tawsilex Integration Flow

```bash
# 1. Create Tawsilex integration
curl -X POST http://localhost:8000/api/api-integrations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tawsilex",
    "type": "delivery",
    "provider": "tawsilex",
    "credentials": {
      "api_token": "your-token"
    }
  }'

# 2. Create shipment from order
curl -X POST http://localhost:8000/api/api-integrations/2/create-shipment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 123
  }'

# 3. Track shipment
curl -X POST http://localhost:8000/api/api-integrations/2/track-shipment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tracking_code": "TWX123456"
  }'

# 4. Get available statuses
curl -X GET http://localhost:8000/api/api-integrations/2/statuses \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 3: Complete BMDelivery Integration Flow

```bash
# 1. Create BMDelivery integration
curl -X POST http://localhost:8000/api/api-integrations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "BMDelivery",
    "type": "delivery",
    "provider": "bmdelivery",
    "credentials": {
      "api_token": "your-token"
    }
  }'

# 2. Get available cities
curl -X GET http://localhost:8000/api/api-integrations/3/cities \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Create shipment from order
curl -X POST http://localhost:8000/api/api-integrations/3/create-shipment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 456
  }'

# 4. Track shipment
curl -X POST http://localhost:8000/api/api-integrations/3/track-shipment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tracking_code": "BMD123456"
  }'
```

---

## Environment Variables

Add these to your `.env` file (optional, for default configurations):

```env
# Shopify Integration (Optional)
SHOPIFY_SHOP_URL=
SHOPIFY_ACCESS_TOKEN=
SHOPIFY_API_VERSION=2024-01

# Tawsilex Integration (Optional)
TAWSILEX_API_TOKEN=

# BMDelivery Integration (Optional)
BMDELIVERY_API_TOKEN=
```

---

## Status Mapping

### Tawsilex Status Mapping

| Tawsilex Status | Internal Status |
|-----------------|-----------------|
| en_attente | pending |
| ramassage | confirmed |
| en_cours | shipped |
| livre | delivered |
| annule | cancelled |
| retour | cancelled |

### BMDelivery Status Mapping

| BMDelivery Status | Internal Status |
|-------------------|-----------------|
| pending | pending |
| picked_up | confirmed |
| in_transit | shipped |
| delivered | delivered |
| cancelled | cancelled |
| returned | cancelled |

### Shopify Status Mapping

| Shopify Status | Internal Status |
|----------------|-----------------|
| paid | confirmed |
| refunded | cancelled |
| pending | pending |

---

## Error Handling

All API endpoints return standard HTTP status codes:

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Server Error

Error response format:

```json
{
  "message": "Error description",
  "errors": {
    "field": ["Validation error message"]
  }
}
```

---

## Best Practices

1. **Test Connection First**: Always test the connection before syncing
2. **Monitor Logs**: Check sync logs regularly for errors
3. **Handle Rate Limits**: Be aware of API rate limits (1000 requests/hour for Tawsilex and BMDelivery)
4. **Secure Credentials**: Never commit API tokens to version control
5. **Use Webhooks**: Consider implementing webhooks for real-time updates (Shopify)
6. **Sync Regularly**: Set up scheduled syncs for automatic order updates
7. **Error Recovery**: Implement retry logic for failed syncs

---

## Troubleshooting

### Connection Test Fails

- Verify credentials are correct
- Check if API token is active
- Ensure shop URL includes `https://` and `.myshopify.com` (for Shopify)
- Check network connectivity

### Orders Not Syncing

- Check if integration is active (`is_active: true`)
- Verify `last_sync_at` timestamp
- Check sync logs for specific errors
- Ensure orders exist in the source system

### Shipment Creation Fails

- Verify order has all required fields (client name, phone, city, address)
- Check if products exist in the order
- Ensure city name matches delivery company's city list
- Verify API token has permission to create shipments

---

## Support

For integration-specific issues:

- **Shopify**: [Shopify API Documentation](https://shopify.dev/docs/api)
- **Tawsilex**: [Tawsilex API Documentation](https://tawsilex.com/doc/api-client)
- **BMDelivery**: [BMDelivery API Documentation](https://bmdelivery.ma/doc/api-client)

For application issues, check the Laravel logs at `storage/logs/laravel.log`.

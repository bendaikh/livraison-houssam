# Marketplace Feature Documentation

## Overview

The Marketplace feature allows you to manage product assignments to vendors. This enables a multi-vendor marketplace system where:

- You offer products to multiple vendors
- Vendors can see only the products assigned to them
- Each product-vendor assignment can be activated or deactivated
- Custom commission rates can be set per product-vendor combination
- Track which vendors are selling which products

## Database Structure

### `marketplace_products` Table

This pivot table connects products with vendors:

- `id` - Primary key
- `product_id` - Foreign key to products table
- `vendor_id` - Foreign key to vendors table
- `is_active` - Boolean flag to activate/deactivate the assignment
- `commission_rate` - Optional custom commission rate (overrides vendor's default)
- `assigned_quantity` - Number of units assigned to this vendor
- `activated_at` - Timestamp when the assignment was activated
- `deactivated_at` - Timestamp when the assignment was deactivated
- `created_at` / `updated_at` - Standard timestamps

## API Endpoints

All endpoints require authentication (`auth:sanctum` middleware).

### Get All Marketplace Products
```
GET /api/marketplace
```
Query Parameters:
- `search` - Search by product name or SKU
- `is_active` - Filter by active status (true/false)
- `per_page` - Items per page (default: 15)

### Get Marketplace Statistics
```
GET /api/marketplace/statistics
```
Returns:
- Total products count
- Assigned products count
- Unassigned products count
- Total vendors count
- Active/inactive assignments count
- Top vendors by product count

### Get Product Details with Assignments
```
GET /api/marketplace/products/{product}
```
Returns product with all vendor assignments and available vendors.

### Assign Product to Vendor
```
POST /api/marketplace/products/{product}/assign
```
Body:
```json
{
  "vendor_id": 1,
  "commission_rate": 15.5,  // Optional
  "assigned_quantity": 100,  // Optional
  "is_active": true
}
```

### Update Assignment
```
PATCH /api/marketplace/assignments/{marketplaceProduct}
```
Body:
```json
{
  "commission_rate": 20,
  "assigned_quantity": 150,
  "is_active": false
}
```

### Toggle Assignment Activation
```
POST /api/marketplace/assignments/{marketplaceProduct}/toggle
```
Toggles the `is_active` status.

### Remove Assignment
```
DELETE /api/marketplace/assignments/{marketplaceProduct}
```

### Bulk Assign Products
```
POST /api/marketplace/bulk-assign
```
Body:
```json
{
  "vendor_id": 1,
  "product_ids": [1, 2, 3, 4],
  "commission_rate": 15,  // Optional
  "is_active": true
}
```

### Bulk Toggle Activation
```
POST /api/marketplace/bulk-toggle
```
Body:
```json
{
  "marketplace_product_ids": [1, 2, 3],
  "is_active": false
}
```

### Get Vendors with Their Products
```
GET /api/marketplace/vendor-products
```
Query Parameters:
- `search` - Search by vendor name or email
- `per_page` - Items per page (default: 15)

## Frontend Usage

### Accessing the Marketplace

Navigate to the "Marketplace" section in the sidebar. The page displays:

1. **Statistics Cards** - Overview of products, assignments, and vendors
2. **Search Bar** - Search products by name or SKU
3. **Products List** - All products with their vendor assignments

### Managing Product Assignments

#### Assign a Product to a Vendor

1. Click "Assign Vendor" button on any product
2. Select a vendor from the dropdown
3. Optionally set a custom commission rate
4. Set the assigned quantity
5. Choose whether to activate immediately
6. Click "Assign Vendor"

#### View Product Assignments

Click the expand button (chevron) on any product to see all vendor assignments.

#### Toggle Assignment Status

Click the toggle icon next to any assignment to activate/deactivate it.

#### Remove Assignment

Click the trash icon to remove a vendor assignment from a product.

## Business Logic

### Commission Rates

- Each vendor has a default commission rate
- You can override this with a custom rate per product
- If no custom rate is set, the vendor's default rate is used

### Product Visibility for Vendors

- Vendors can only see products that are assigned to them
- Only active assignments are visible to vendors
- Deactivated assignments hide the product from the vendor

### Stock Management

- The `assigned_quantity` field tracks how many units are allocated to each vendor
- This is informational and doesn't affect actual stock quantities
- Useful for tracking distribution across vendors

## Seeding Test Data

To populate the marketplace with test data:

```bash
php artisan db:seed --class=MarketplaceSeeder
```

This will:
- Assign existing products to random vendors
- Create various commission rates
- Set different activation statuses
- Assign random quantities

## Dashboard Enhancements

The dashboard now shows real data including:

### New Statistics
- **Clients**: Total, new this period, active clients
- **Vendors**: Total, active, total commission earned
- **Products**: Total, active, low stock, out of stock

### New Sections
- **Top Selling Products**: Best performers by units sold
- **Top Clients**: Highest spending customers
- All data is filtered by the selected period (daily/monthly/yearly)

## Models and Relationships

### Product Model
```php
// Get all vendors assigned to this product
$product->marketplaceVendors

// Get all marketplace assignments
$product->marketplaceProducts
```

### Vendor Model
```php
// Get all assigned products
$vendor->marketplaceProducts

// Get only active assignments
$vendor->activeMarketplaceProducts
```

### MarketplaceProduct Model
```php
// Get the product
$assignment->product

// Get the vendor
$assignment->vendor
```

## Security Considerations

- All API endpoints require authentication
- Vendor assignments are unique (one product can only be assigned once to a vendor)
- Soft deletes are used for products (assignments are cascade deleted)
- Commission rates are validated (0-100%)

## Future Enhancements

Potential improvements:
- Vendor dashboard to view their assigned products
- Sales tracking per vendor
- Commission calculation and payout system
- Inventory allocation per vendor
- Vendor performance analytics
- Automated assignment based on rules
- Product request system for vendors

## Troubleshooting

### Products not showing in marketplace
- Ensure products are marked as active (`is_active = true`)
- Check if products exist in the database

### Vendor assignments not saving
- Verify vendor exists and is active
- Check for duplicate assignments (unique constraint)
- Ensure commission rate is between 0-100

### Frontend not updating
- Clear browser cache
- Rebuild assets: `npm run build`
- Check browser console for errors

## Support

For issues or questions, check:
- Laravel logs: `storage/logs/laravel.log`
- Browser console for frontend errors
- API responses for detailed error messages

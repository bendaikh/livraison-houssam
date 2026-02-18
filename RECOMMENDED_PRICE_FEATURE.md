# Recommended Selling Price & Seller Profit Calculator

## Overview
Added a "Recommended Selling Price" feature that automatically calculates seller profit based on:
- Selling Price (Recommended)
- Product Cost (Seller Price)
- Delivery Fee (Fixed at 35 DH)
- Net Profit = Selling Price - Product Cost - Delivery Fee

## Features Implemented

### 1. Recommended Selling Price Field
**Location**: Product Form (Create/Edit Product)

**Field Details**:
- Label: "Recommended Selling Price (Seller can change this)"
- Purpose: Suggest a selling price to sellers while allowing them to set their own
- Optional field (not required)
- Displayed in currency format

### 2. Seller Profit Calculator
**Visual Display** shows:

```
┌─────────────────────────────────────────────┐
│  Seller Profit Calculation                  │
│  Estimated profit for seller                │
├─────────────────────────────────────────────┤
│  Selling Price (Recommended)    100.00 DH   │
│  Product Cost                 -  50.00 DH   │
│  Delivery Fee                 -  35.00 DH   │
│  ─────────────────────────────────────────  │
│  Net Profit                      15.00 DH   │
│  Profit Margin                     30.0%    │
└─────────────────────────────────────────────┘
```

**Calculations**:
- **Net Profit** = Recommended Price - Seller Price - 35 DH
- **Profit Margin** = (Net Profit / Seller Price) × 100%

### 3. Dynamic Updates
- Calculator updates automatically when you change:
  - Recommended Selling Price
  - Seller Price (Product Cost)
- Uses your configured currency from Settings
- Shows all amounts in your chosen currency format

## Database Changes

### Migration Created
**File**: `2026_02_18_140100_add_recommended_price_to_products_table.php`

**Change**:
```sql
ALTER TABLE products 
ADD COLUMN recommended_price DECIMAL(10,2) NULL 
AFTER vendor_price;
```

### Model Updated
**File**: `app/Models/Product.php`

**Added**:
- `recommended_price` to `$fillable` array
- `recommended_price` to `$casts` array with `decimal:2` type

## Frontend Changes

### ProductForm.jsx Updated
**Location**: `resources/js/pages/Products/ProductForm.jsx`

**Changes**:
1. ✅ Imported `useSettings` for currency formatting
2. ✅ Added `recommended_price` to form state
3. ✅ Added Recommended Selling Price input field
4. ✅ Added Seller Profit Calculator section
5. ✅ Calculator shows:
   - Selling Price (Recommended)
   - Product Cost (minus)
   - Delivery Fee 35 DH (minus)
   - Net Profit (result)
   - Profit Margin percentage
6. ✅ Note about fixed delivery fee

## How It Works

### For Admin (Creating Product)

1. **Fill in basic product info**
2. **Enter Product Prices**:
   - Company Price: Your selling price
   - Seller Price: Cost from seller
   - **Recommended Selling Price**: ← NEW! Suggest a price for sellers

3. **View Profit Calculator** (appears automatically):
   - Shows seller's estimated profit
   - Accounts for 35 DH delivery fee
   - Shows profit percentage

### For Sellers (When They See This)

When sellers view the product, they will see:
- **Product Cost**: How much they pay you (Seller Price)
- **Recommended Price**: Your suggested selling price
- **Delivery Fee**: 35 DH (fixed)
- **Expected Profit**: Automatically calculated

**They can**:
- Use the recommended price
- Or set their own price
- See their profit before selling

## Example Calculation

### Scenario:
- **Seller Price (Product Cost)**: 50 DH
- **Recommended Selling Price**: 100 DH
- **Delivery Fee**: 35 DH (fixed)

### Calculation:
```
Selling Price:        100 DH
- Product Cost:     -  50 DH
- Delivery Fee:     -  35 DH
─────────────────────────────
Net Profit:            15 DH

Profit Margin: (15 / 50) × 100 = 30%
```

## Benefits

1. **Transparency**: Sellers know their profit upfront
2. **Guidance**: You suggest profitable prices
3. **Flexibility**: Sellers can adjust prices
4. **Automation**: Profit calculated automatically
5. **Clarity**: Shows delivery costs explicitly

## Business Logic

### Fixed Delivery Fee: 35 DH
The system currently uses a **fixed delivery fee of 35 DH** for calculations.

**Note displayed**:
> "This is based on a fixed delivery fee of 35 DH. Actual profit may vary based on actual delivery costs."

### Future Enhancement
Could be updated to:
- Variable delivery fees by city/region
- Calculated based on weight/distance
- Pulled from delivery API integration

## Usage Instructions

### Creating a Product with Recommended Price

1. Navigate to Products > Create Product
2. Fill in product details
3. Under **Pricing Information**:
   - Enter Company Price (your price)
   - Enter Seller Price (cost from seller)
   - **Enter Recommended Selling Price** ← NEW!
4. View the **Seller Profit Calculator** section
5. Adjust recommended price if needed to ensure good profit
6. Save product

### What Sellers See
- Product Cost: Clear
- Recommended Price: As guidance
- Delivery Fee: 35 DH
- Expected Profit: Calculated
- They can accept or modify

## Technical Details

### Files Modified

**Backend**:
1. `database/migrations/2026_02_18_140100_add_recommended_price_to_products_table.php` - New
2. `app/Models/Product.php` - Updated fillable & casts

**Frontend**:
1. `resources/js/pages/Products/ProductForm.jsx` - Major update

### Field Specifications

**Database Column**:
- Name: `recommended_price`
- Type: `DECIMAL(10,2)`
- Nullable: Yes
- Position: After `vendor_price`

**Form Field**:
- Type: Number input
- Step: 0.01
- Min: 0
- Currency symbol: Dynamic (from settings)

### Calculator Display

**Component Structure**:
```jsx
- Emerald gradient background
- Header with icon
- Line items:
  ✓ Selling Price (positive)
  ✓ Product Cost (negative, red)
  ✓ Delivery Fee (negative, red)
  ✓ Net Profit (large, green)
  ✓ Profit Margin % (white box)
- Info note (blue box)
```

## Testing Checklist

- ✅ Migration runs successfully
- ✅ Field appears in product form
- ✅ Calculator shows when both prices entered
- ✅ Profit calculates correctly
- ✅ Currency format uses settings
- ✅ Field saves to database
- ✅ Field loads when editing product
- ✅ Build successful - no errors

## Formula Reference

### Net Profit
```
Net Profit = Recommended_Price - Seller_Price - 35
```

### Profit Margin
```
Profit_Margin = ((Recommended_Price - Seller_Price - 35) / Seller_Price) × 100
```

## Summary

✅ **Database updated** - `recommended_price` column added
✅ **Model updated** - Field added to fillable & casts
✅ **Frontend updated** - New field & calculator added
✅ **Currency integrated** - Uses dynamic formatting
✅ **Build successful** - No errors
✅ **Ready to use** - Feature complete

---

**Date**: February 18, 2026
**Status**: Complete ✅
**Feature**: Recommended Selling Price with Profit Calculator

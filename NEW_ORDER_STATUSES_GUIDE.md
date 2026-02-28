# Order Status System - Complete Reference

## ✅ Implemented: Granular Order Statuses

Your order status system now has **11 distinct statuses** that accurately reflect the delivery lifecycle, matching BMDelivery's statuses.

## New Order Statuses

### Complete Status List

| Status | Description | When Used | Color Badge |
|--------|-------------|-----------|-------------|
| **pending** | Order created, awaiting confirmation | Initial state | 🟡 Yellow |
| **confirmed** | Order confirmed, ready to ship | After confirmation | 🔵 Blue |
| **picked_up** | Package picked up by delivery company | BMD: "Ramassé" | 🟣 Indigo |
| **ready_for_shipping** | Package ready to ship | BMD: "Prêt pour expédition" | 🔷 Cyan |
| **shipped** | Package in transit | BMD: "Expédié" | 🟣 Purple |
| **out_for_delivery** | Out for final delivery | BMD: "En cours de livraison" | 🟪 Violet |
| **delivered** | Successfully delivered | BMD: "Livré" | 🟢 Green |
| **cancelled** | Order cancelled | BMD: "Annulé" | 🔴 Red |
| **refused** | Customer refused delivery | BMD: "Refusé" | 🟠 Orange |
| **returned** | Package returned | BMD: "Retourné" | 🩷 Pink |
| **return_requested** | Return requested by customer | BMD: "Demande de retour" | 🌹 Rose |

## BMDelivery Status Mappings

### Updated Mappings (Granular)

| BMDelivery Status (French) | Your App Status | Change from Before |
|----------------------------|-----------------|-------------------|
| En attente de ramassage | `confirmed` | ✅ Same |
| **Ramassé** | **`picked_up`** | ⭐ NEW (was: confirmed) |
| **Prêt pour expédition** | **`ready_for_shipping`** | ⭐ NEW (was: confirmed) |
| Expédié | `shipped` | ✅ Same |
| **En cours de livraison** | **`out_for_delivery`** | ⭐ NEW (was: shipped) |
| Livré | `delivered` | ✅ Same |
| Annulé | `cancelled` | ✅ Same |
| **Refusé** | **`refused`** | ⭐ NEW (was: cancelled) |
| **Retourné** | **`returned`** | ⭐ NEW (was: cancelled) |
| **Demande de retour** | **`return_requested`** | ⭐ NEW (was: cancelled) |

## Status Flow Examples

### Successful Delivery

```
pending
  ↓ (confirm order)
confirmed
  ↓ (BMD picks up)
picked_up
  ↓ (BMD prepares)
ready_for_shipping
  ↓ (BMD ships)
shipped
  ↓ (BMD out for delivery)
out_for_delivery
  ↓ (delivered)
delivered ✅
```

### Refused Delivery

```
pending → confirmed → picked_up → shipped → out_for_delivery
  ↓ (customer refuses)
refused ❌
```

### Returned Package

```
pending → confirmed → picked_up → shipped → out_for_delivery
  ↓ (return initiated)
return_requested
  ↓ (returned to sender)
returned ❌
```

### Cancelled Order

```
pending → confirmed
  ↓ (cancelled before shipping)
cancelled ❌
```

## Database Changes

### Migration Added

**File:** `database/migrations/2026_02_28_000001_add_more_order_statuses.php`

**Changes:**
1. Status field changed from `enum` to `string(50)` for flexibility
2. Added new timestamp fields:
   - `picked_up_at`
   - `ready_for_shipping_at`
   - `out_for_delivery_at`
   - `refused_at`
   - `returned_at`

### Orders Table Schema (After Migration)

```sql
orders
├── status VARCHAR(50) -- New: flexible status field
├── confirmed_at TIMESTAMP
├── picked_up_at TIMESTAMP -- NEW
├── ready_for_shipping_at TIMESTAMP -- NEW
├── sent_to_delivery_at TIMESTAMP
├── out_for_delivery_at TIMESTAMP -- NEW
├── shipped_at TIMESTAMP
├── delivered_at TIMESTAMP
├── cancelled_at TIMESTAMP
├── refused_at TIMESTAMP -- NEW
└── returned_at TIMESTAMP -- NEW
```

## Files Modified

### Backend (7 files)

1. ✅ **Migration** - `database/migrations/2026_02_28_000001_add_more_order_statuses.php`
   - Change status to string
   - Add new timestamp fields

2. ✅ **Order Model** - `app/Models/Order.php`
   - Added new fillable fields
   - Added new cast fields for timestamps

3. ✅ **OrderController** - `app/Http/Controllers/OrderController.php`
   - Updated validation rules (2 places)
   - Updated status mappings

4. ✅ **OrderService** - `app/Services/OrderService.php`
   - Updated status timestamp logic
   - Now sets timestamps for all new statuses

5. ✅ **WebhookController** - `app/Http/Controllers/WebhookController.php`
   - Updated status mappings for webhook

6. ✅ **SyncDeliveryStatuses Command** - `app/Console/Commands/SyncDeliveryStatuses.php`
   - Updated status mappings

7. ✅ **OrderController Status Mapping** - Private method
   - Maps BMDelivery French statuses to new granular statuses

### Frontend (2 files)

8. ✅ **OrderDetail.jsx** - `resources/js/pages/Orders/OrderDetail.jsx`
   - Added colors for all 11 statuses
   - Updated status icons

9. ✅ **OrderList.jsx** - `resources/js/pages/Orders/OrderList.jsx`
   - Added badge colors for all 11 statuses

## Deployment Steps

### 1. Run Migration

```bash
php artisan migrate
```

This will:
- Change `status` from enum to string
- Add 5 new timestamp fields

### 2. Clear Caches

```bash
php artisan cache:clear
php artisan config:clear
php artisan route:clear
```

### 3. Test Status Sync

```bash
# Sync an order
php artisan orders:sync-delivery-statuses --order-id=205
```

Expected: Order statuses now match BMDelivery exactly!

## Testing Checklist

### Backend Tests

- [ ] Create order with `pending` status
- [ ] Update to `confirmed`
- [ ] Sync from BMDelivery showing "Ramassé" → should be `picked_up`
- [ ] Sync from BMDelivery showing "Prêt pour expédition" → should be `ready_for_shipping`
- [ ] Sync from BMDelivery showing "Expédié" → should be `shipped`
- [ ] Sync from BMDelivery showing "En cours de livraison" → should be `out_for_delivery`
- [ ] Sync from BMDelivery showing "Livré" → should be `delivered`
- [ ] Sync from BMDelivery showing "Refusé" → should be `refused`
- [ ] Sync from BMDelivery showing "Retourné" → should be `returned`

### Frontend Tests

- [ ] Order list shows correct badge colors for all statuses
- [ ] Order detail shows correct status with proper color
- [ ] Status icons display correctly
- [ ] Sync button works and updates to new statuses

### Database Tests

- [ ] Timestamp fields populated correctly when status changes
- [ ] `picked_up_at` set when status = `picked_up`
- [ ] `ready_for_shipping_at` set when status = `ready_for_shipping`
- [ ] `out_for_delivery_at` set when status = `out_for_delivery`
- [ ] `refused_at` set when status = `refused`
- [ ] `returned_at` set when status = `returned`

## Status Colors Reference

```css
pending          → Yellow   (bg-yellow-100 text-yellow-800)
confirmed        → Blue     (bg-blue-100 text-blue-800)
picked_up        → Indigo   (bg-indigo-100 text-indigo-800)
ready_for_shipping → Cyan   (bg-cyan-100 text-cyan-800)
shipped          → Purple   (bg-purple-100 text-purple-800)
out_for_delivery → Violet   (bg-violet-100 text-violet-800)
delivered        → Green    (bg-green-100 text-green-800)
cancelled        → Red      (bg-red-100 text-red-800)
refused          → Orange   (bg-orange-100 text-orange-800)
returned         → Pink     (bg-pink-100 text-pink-800)
return_requested → Rose     (bg-rose-100 text-rose-800)
```

## Example: Before vs After

### Before (5 Basic Statuses)

```
BMDelivery: "Ramassé"     → Your App: "confirmed" ❌ Not accurate
BMDelivery: "Expédié"     → Your App: "shipped"   ✅ OK
BMDelivery: "Refusé"      → Your App: "cancelled" ❌ Lost information
BMDelivery: "Retourné"    → Your App: "cancelled" ❌ Lost information
```

### After (11 Granular Statuses)

```
BMDelivery: "Ramassé"     → Your App: "picked_up"  ✅ Exact match!
BMDelivery: "Expédié"     → Your App: "shipped"    ✅ Same
BMDelivery: "Refusé"      → Your App: "refused"    ✅ Exact match!
BMDelivery: "Retourné"    → Your App: "returned"   ✅ Exact match!
```

## Benefits

✅ **Accurate Status Tracking** - Your statuses match BMDelivery exactly
✅ **Better Visibility** - Know exactly where each order is in the delivery process
✅ **Distinguish Failed Deliveries** - "Refused" vs "Returned" vs "Cancelled"
✅ **Granular Reporting** - Track metrics for each specific status
✅ **Improved Customer Service** - Precise status information for customers

## API Status Values

When creating/updating orders via API, use these status values:

```json
{
  "status": "pending|confirmed|picked_up|ready_for_shipping|shipped|out_for_delivery|delivered|cancelled|refused|returned|return_requested"
}
```

## Quick Reference

**Problem:** BMDelivery statuses like "Refusé" were mapping to generic "cancelled"

**Solution:** Added 6 new statuses to match delivery company lifecycle

**Result:** Perfect 1:1 mapping between BMDelivery and your app! 🎉

---

**Status:** ✅ Complete and ready for deployment
**Migration:** Required - run `php artisan migrate`
**Breaking Changes:** None (existing statuses still work)
**Backward Compatible:** Yes

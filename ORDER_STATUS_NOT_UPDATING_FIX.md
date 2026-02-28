# Order Status Not Updating - FIXED

## Problem

BMDelivery shows "Refuse" status, but when syncing, the order status in your app stays "confirmed" instead of changing to "refused".

### Example from User

```
BMDelivery Dashboard: Status = "Refuse"
Your App After Sync:  Status = "confirmed" ❌ (should be "refused")
```

## Root Cause

The sync logic only updated the order status **if the delivery_status changed**:

```php
// OLD CODE - WRONG
if ($result['status_changed']) {
    // Only runs if delivery_status changed
    $orderStatus = $this->mapDeliveryStatusToOrderStatus($result['new_delivery_status']);
    if ($orderStatus && $orderStatus !== $order->status) {
        $this->orderService->updateOrderStatus($order->id, $orderStatus, ...);
    }
}
// If delivery_status didn't change, order status was never checked!
```

### The Problem Scenario

1. Order created → status: "confirmed"
2. Sent to BMDelivery → delivery_status: "Refuse" (saved in DB)
3. User clicks "Sync Status"
4. BMDelivery returns: "Refuse"
5. System checks: delivery_status already = "Refuse", so `status_changed` = **false**
6. Code skips the order status update block
7. Result: Order status stays "confirmed" ❌

## The Fix

Now the system checks and updates order status **regardless** of whether delivery_status changed:

```php
// NEW CODE - CORRECT
if ($result['status_changed']) {
    // Delivery status changed - update order status
    $orderStatus = $this->mapDeliveryStatusToOrderStatus($result['new_delivery_status']);
    if ($orderStatus && $orderStatus !== $order->status) {
        $this->orderService->updateOrderStatus($order->id, $orderStatus, ...);
    }
} else {
    // Even if delivery status didn't change, check if order status needs updating
    $orderStatus = $this->mapDeliveryStatusToOrderStatus($result['new_delivery_status']);
    if ($orderStatus && $orderStatus !== $order->status) {
        $this->orderService->updateOrderStatus($order->id, $orderStatus, ...);
    }
}
```

### Now It Works

1. Order created → status: "confirmed"
2. Sent to BMDelivery → delivery_status: "Refuse"
3. User clicks "Sync Status"
4. BMDelivery returns: "Refuse"
5. System checks: delivery_status already = "Refuse", so `status_changed` = false
6. **NEW:** Code enters else block and checks if order status needs updating
7. Maps "Refuse" → "refused"
8. Order status: "confirmed" → **"refused"** ✅

## Files Modified

1. ✅ `app/Http/Controllers/OrderController.php` - Fixed syncDeliveryStatus logic
2. ✅ `app/Console/Commands/SyncDeliveryStatuses.php` - Fixed scheduled sync logic
3. ✅ `app/Services/BMDeliveryService.php` - Added better logging

## Status Mapping Reference

These mappings work (case-insensitive):

| BMDelivery Status | Your App Status |
|-------------------|-----------------|
| Refuse | refused |
| Refusé | refused |
| refused | refused |
| Retourne | returned |
| Retourné | returned |
| Annule | cancelled |
| Annulé | cancelled |
| Ramasse | picked_up |
| Ramassé | picked_up |
| Expedie | shipped |
| Expédié | shipped |
| En cours de livraison | out_for_delivery |
| Livre | delivered |
| Livré | delivered |

## Testing

### Test Case 1: Status Didn't Change in BMD

**Scenario:** Order already has delivery_status="Refuse" in DB, BMD still shows "Refuse"

**Before Fix:**
```
1. Click "Sync Status"
2. BMD returns: "Refuse"
3. System: delivery_status already "Refuse", skip update
4. Result: Order status stays "confirmed" ❌
```

**After Fix:**
```
1. Click "Sync Status"
2. BMD returns: "Refuse"
3. System: delivery_status already "Refuse", but check order status
4. Maps "refuse" → "refused"
5. Updates: "confirmed" → "refused" ✅
```

### Test Case 2: Status Changed in BMD

**Scenario:** Order has delivery_status="Expédié", BMD now shows "Refuse"

**Before Fix:**
```
1. Click "Sync Status"
2. BMD returns: "Refuse"
3. System: delivery_status changed "Expédié" → "Refuse"
4. Updates order status: "shipped" → "refused" ✅
```

**After Fix:**
```
Same as before - still works! ✅
```

## Deployment

Upload the 3 modified files:

```bash
git add app/Http/Controllers/OrderController.php
git add app/Console/Commands/SyncDeliveryStatuses.php
git add app/Services/BMDeliveryService.php
git commit -m "Fix: Update order status even when delivery_status doesn't change"
git push

# On production
git pull
php artisan cache:clear
```

## How to Fix Existing Orders

If you have orders stuck in "confirmed" that should be "refused":

### Option 1: Click Sync Again

1. Open the order
2. Click "Sync Status" button
3. Now it will update to "refused" ✅

### Option 2: Run Sync Command

```bash
# Sync all orders
php artisan orders:sync-delivery-statuses

# Or sync specific order
php artisan orders:sync-delivery-statuses --order-id=224
```

### Option 3: Manual Update

```sql
-- Find orders with "Refuse" delivery_status but wrong order status
SELECT id, order_number, status, delivery_status 
FROM orders 
WHERE LOWER(delivery_status) = 'refuse' 
  AND status != 'refused';

-- Update them
UPDATE orders 
SET status = 'refused', 
    refused_at = NOW() 
WHERE LOWER(delivery_status) = 'refuse' 
  AND status != 'refused';
```

## Logs to Check

After deploying, check logs for these messages:

```
✅ Good - Status mapped correctly:
"Attempting to map delivery status to order status"
{
  "delivery_status": "Refuse",
  "mapped_order_status": "refused",
  "current_order_status": "confirmed"
}

"Order status updated from confirmed to refused"

❌ Bad - Status not mapped:
"Order status not updated"
{
  "reason": "No mapped status found",
  "delivery_status": "Refuse"
}
```

## Why This Happened

The original code assumed:
- If delivery_status changes → Update order status ✅
- If delivery_status doesn't change → Nothing to do ❌

But this missed the case where:
- Order was sent to BMDelivery with status "Refuse"
- delivery_status was saved as "Refuse"
- BUT order status was never updated from "confirmed" to "refused"

The fix ensures order status is **always** checked and updated to match the delivery_status, regardless of whether the delivery_status itself changed.

## Summary

**Problem:** Orders stuck in "confirmed" status when BMDelivery shows "Refuse"

**Cause:** Logic only updated order status if delivery_status changed

**Fix:** Always check and update order status, even if delivery_status didn't change

**Result:** Order status now correctly syncs to "refused" when BMDelivery shows "Refuse" ✅

---

**Status:** ✅ Fixed
**Breaking Changes:** None
**Migration Required:** No
**Files Changed:** 3

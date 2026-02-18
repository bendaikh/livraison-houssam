# Order Edit - WhatsApp & Confirmation Agent Fix

## Issue Identified
When editing an order, the `confirmation_agent_id` and `whatsapp` fields were not being saved or retrieved correctly.

## Root Causes

### 1. Missing Update Method in OrderController
**Problem:** The `OrderController` only had a `store` method for creating orders but no `update` method for editing them.

**Solution:** Added the `update` method to `OrderController`:
```php
public function update(Request $request, Order $order)
{
    $validated = $request->validate([
        'client_id' => 'required|exists:clients,id',
        'vendor_id' => 'nullable|exists:vendors,id',
        'delivery_agent_id' => 'nullable|exists:users,id',
        'confirmation_agent_id' => 'nullable|exists:users,id',
        'source' => 'string|in:manual,shopify,delivery_company,marketplace',
        'items' => 'required|array|min:1',
        'items.*.product_id' => 'required|exists:products,id',
        'items.*.quantity' => 'required|integer|min:1',
        'items.*.price' => 'required|numeric|min:0',
        'shipping_cost' => 'nullable|numeric|min:0',
        'tax' => 'nullable|numeric|min:0',
        'discount' => 'nullable|numeric|min:0',
        'shipping_address' => 'nullable|string',
        'notes' => 'nullable|string',
        'whatsapp' => 'nullable|string',
    ]);

    $order = $this->orderService->updateOrder($order->id, $validated);

    return response()->json($order);
}
```

### 2. Missing Fields in OrderService->createOrder
**Problem:** The `createOrder` method in `OrderService` was not saving `confirmation_agent_id` and `whatsapp` fields.

**Solution:** Updated the order creation to include these fields:
```php
$order = Order::create([
    // ... other fields
    'confirmation_agent_id' => $data['confirmation_agent_id'] ?? null,
    'whatsapp' => $data['whatsapp'] ?? null,
]);
```

### 3. Missing updateOrder Method in OrderService
**Problem:** There was no `updateOrder` method to handle the update logic.

**Solution:** Added a complete `updateOrder` method:
```php
public function updateOrder(int $orderId, array $data)
{
    return DB::transaction(function () use ($orderId, $data) {
        $order = Order::findOrFail($orderId);
        
        // Calculate totals
        $subtotal = 0;
        foreach ($data['items'] as $item) {
            $subtotal += $item['price'] * $item['quantity'];
        }

        $total = $subtotal + ($data['shipping_cost'] ?? 0) + ($data['tax'] ?? 0) - ($data['discount'] ?? 0);

        // Calculate commission if vendor order
        $commissionAmount = 0;
        if (isset($data['vendor_id']) && $data['vendor_id']) {
            $vendor = \App\Models\Vendor::find($data['vendor_id']);
            if ($vendor) {
                $commissionAmount = ($total * $vendor->commission_rate) / 100;
            }
        }

        // Update order
        $order->update([
            'client_id' => $data['client_id'],
            'vendor_id' => $data['vendor_id'] ?? null,
            'delivery_agent_id' => $data['delivery_agent_id'] ?? null,
            'confirmation_agent_id' => $data['confirmation_agent_id'] ?? null,
            'source' => $data['source'] ?? 'manual',
            'subtotal' => $subtotal,
            'shipping_cost' => $data['shipping_cost'] ?? 0,
            'tax' => $data['tax'] ?? 0,
            'discount' => $data['discount'] ?? 0,
            'total' => $total,
            'commission_amount' => $commissionAmount,
            'shipping_address' => $data['shipping_address'] ?? null,
            'notes' => $data['notes'] ?? null,
            'whatsapp' => $data['whatsapp'] ?? null,
        ]);

        // Delete existing items
        $order->items()->delete();

        // Create new order items
        foreach ($data['items'] as $item) {
            $order->items()->create([
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
                'subtotal' => $item['price'] * $item['quantity'],
            ]);
        }

        // Create history entry
        $this->addHistory($order->id, $order->status, 'Order updated');

        return $order->load(['items.product', 'client', 'vendor', 'deliveryAgent', 'confirmationAgent']);
    });
}
```

### 4. WhatsApp Field Being Overwritten on Client Selection
**Problem:** When editing an order, selecting the client would overwrite the existing WhatsApp field with the client's phone number.

**Solution:** Updated `handleClientChange` in `OrderForm.jsx` to preserve existing WhatsApp value:
```javascript
const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === parseInt(clientId));
    setSelectedClient(client);
    
    // Only auto-fill whatsapp if it's empty (to avoid overwriting when editing)
    const newWhatsapp = formData.whatsapp || client?.phone || '';
    
    setFormData({
        ...formData,
        client_id: clientId,
        shipping_address: client?.address || formData.shipping_address || '',
        whatsapp: newWhatsapp
    });
};
```

## Files Modified

### Backend
1. **`app/Http/Controllers/OrderController.php`**
   - Added `update()` method

2. **`app/Services/OrderService.php`**
   - Updated `createOrder()` to include `confirmation_agent_id` and `whatsapp`
   - Added `updateOrder()` method

### Frontend
3. **`resources/js/pages/Orders/OrderForm.jsx`**
   - Updated `handleClientChange()` to preserve existing WhatsApp value

## Testing Steps

### Test 1: Create Order with Confirmation Agent and WhatsApp
1. Navigate to Orders → Create Order
2. Select a client
3. Select a confirmation agent
4. Enter a WhatsApp number (different from client's phone)
5. Add products
6. Save the order
7. **Expected:** Order is created with confirmation agent and WhatsApp saved

### Test 2: Edit Order - Verify Fields Are Retrieved
1. Navigate to the order created in Test 1
2. Click Edit icon
3. **Expected:** Confirmation agent is pre-selected in the dropdown
4. **Expected:** WhatsApp field shows the saved WhatsApp number

### Test 3: Edit Order - Verify Fields Are Saved
1. In the edit form, change the confirmation agent
2. Change the WhatsApp number
3. Save the order
4. View the order details
5. **Expected:** New confirmation agent is displayed
6. **Expected:** New WhatsApp number is displayed

### Test 4: Edit Order - WhatsApp Not Overwritten by Client Selection
1. Create an order with a specific WhatsApp number (e.g., "0612345678")
2. Edit the order
3. Change the client to a different one
4. **Expected:** WhatsApp field retains "0612345678" and is not overwritten with the new client's phone

## Verification Checklist

- [x] Backend update method added to OrderController
- [x] Backend updateOrder method added to OrderService
- [x] confirmation_agent_id included in createOrder and updateOrder
- [x] whatsapp field included in createOrder and updateOrder
- [x] Frontend handleClientChange preserves existing WhatsApp value
- [x] Frontend builds successfully without errors
- [x] API route for PUT /api/orders/{order} exists (via apiResource)

## Notes

- The Order model already had `confirmation_agent_id` and `whatsapp` in the `$fillable` array
- The API route was already registered via `apiResource` in `routes/api.php`
- The validation rules for both create and update are identical for consistency

## Impact

This fix ensures that:
1. ✅ Confirmation agent assignments are properly saved and retrieved
2. ✅ WhatsApp numbers are properly saved and retrieved
3. ✅ Order editing works completely without data loss
4. ✅ Auto-fill behavior for WhatsApp only applies when the field is empty

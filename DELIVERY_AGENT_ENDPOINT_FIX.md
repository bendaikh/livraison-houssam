# Delivery Agent Endpoint Fix

## Issue
The `/api/delivery-agents` endpoint was returning both `agent_livraison` AND `delivery` role users, which caused delivery persons to appear in the Delivery Agent dropdown.

## Fix
Updated the `deliveryAgents()` method to return ONLY users with the `agent_livraison` role.

## Changes

### `app/Http/Controllers/UserController.php`

**Before:**
```php
public function deliveryAgents()
{
    $agents = User::whereHas('role', function ($query) {
        $query->whereIn('slug', ['agent_livraison', 'delivery']);  // ❌ Included both
    })->where('is_active', true)->get();

    return response()->json($agents);
}
```

**After:**
```php
public function deliveryAgents()
{
    $agents = User::whereHas('role', function ($query) {
        $query->where('slug', 'agent_livraison');  // ✅ Only delivery agents
    })->where('is_active', true)->get();

    return response()->json($agents);
}
```

## API Endpoints Clarification

### `/api/delivery-agents`
- **Returns:** Users with role `agent_livraison` ONLY
- **Purpose:** Populate "Delivery Agent" dropdown
- **Role:** People who MANAGE deliveries

### `/api/delivery-persons`
- **Returns:** Users with role `delivery` ONLY
- **Purpose:** Populate "Delivery Person" dropdown
- **Role:** People who PHYSICALLY DELIVER products

### `/api/confirmation-agents`
- **Returns:** Users with role `agent_confirmation` ONLY
- **Purpose:** Populate "Agent Confirmation" dropdown
- **Role:** People who CONFIRM orders

## Result

Now the dropdowns show the correct users:

**Delivery Agent Dropdown:**
- ✅ Agent Livraison 1
- ✅ Agent Livraison 2
- ❌ ~~Delivery Person 1~~ (removed)
- ❌ ~~Delivery Person 2~~ (removed)

**Delivery Person Dropdown:**
- ✅ Delivery Person 1
- ✅ Delivery Person 2
- ❌ ~~Agent Livraison 1~~ (only in their own dropdown)
- ❌ ~~Agent Livraison 2~~ (only in their own dropdown)

## No Frontend Changes Required
The frontend already uses separate endpoints, so no changes needed in React components.

## Testing
1. Refresh the browser
2. Go to Orders → Create Order
3. **Delivery Agent dropdown** should show only Agent Livraison users
4. **Delivery Person dropdown** should show only Delivery users

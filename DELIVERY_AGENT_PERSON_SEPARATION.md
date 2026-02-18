# Delivery Agent vs Delivery Person Separation

## Issue
The system didn't distinguish between **Delivery Agent** (responsible for managing deliveries) and **Delivery Person** (the one who physically delivers the product). Both roles were combined under one field.

## Solution
Added a separate `delivery_person_id` field to orders to properly distinguish between these two roles.

## Role Definitions

### Delivery Agent (`agent_livraison`)
- **Role:** Responsible person who **manages** deliveries
- **Responsibilities:** 
  - Coordinates delivery operations
  - Assigns delivery persons
  - Tracks delivery status
  - Manages delivery logistics

### Delivery Person (`delivery`)
- **Role:** Person who **physically delivers** the product
- **Responsibilities:**
  - Picks up the product
  - Delivers to the customer
  - Collects payment (if COD)
  - Updates delivery status

## Changes Made

### 1. Database Changes

#### Migration: `add_delivery_person_id_to_orders_table`
```php
Schema::table('orders', function (Blueprint $table) {
    $table->foreignId('delivery_person_id')
        ->nullable()
        ->after('delivery_agent_id')
        ->constrained('users')
        ->onDelete('set null');
});
```

**Fields in Orders Table:**
- `delivery_agent_id` - ID of the delivery agent (manager)
- `delivery_person_id` - ID of the delivery person (deliverer)
- `confirmation_agent_id` - ID of the confirmation agent

### 2. Backend Changes

#### `app/Models/Order.php`
Added `delivery_person_id` to fillable and created relationship:

```php
protected $fillable = [
    // ... other fields
    'delivery_agent_id',
    'delivery_person_id',  // New field
    'confirmation_agent_id',
    // ... other fields
];

public function deliveryPerson(): BelongsTo
{
    return $this->belongsTo(User::class, 'delivery_person_id');
}
```

#### `app/Http/Controllers/UserController.php`
Added new endpoint to fetch delivery persons separately:

```php
public function deliveryPersons()
{
    $persons = User::whereHas('role', function ($query) {
        $query->where('slug', 'delivery');
    })->where('is_active', true)->get();

    return response()->json($persons);
}
```

**API Endpoints:**
- `GET /api/delivery-agents` - Returns users with roles: `agent_livraison` OR `delivery`
- `GET /api/delivery-persons` - Returns users with role: `delivery` only
- `GET /api/confirmation-agents` - Returns users with role: `agent_confirmation`

#### `routes/api.php`
```php
Route::get('/delivery-agents', [UserController::class, 'deliveryAgents']);
Route::get('/delivery-persons', [UserController::class, 'deliveryPersons']);  // New route
Route::get('/confirmation-agents', [UserController::class, 'confirmationAgents']);
```

#### `app/Http/Controllers/OrderController.php`
Updated validation and relationships:

```php
// In store() and update()
$validated = $request->validate([
    // ... other fields
    'delivery_agent_id' => 'nullable|exists:users,id',
    'delivery_person_id' => 'nullable|exists:users,id',  // New field
    'confirmation_agent_id' => 'nullable|exists:users,id',
    // ... other fields
]);

// In index() and show()
$query = Order::with([
    'client', 
    'vendor', 
    'deliveryAgent', 
    'deliveryPerson',  // New relationship
    'confirmationAgent', 
    'items.product'
]);
```

#### `app/Services/OrderService.php`
Updated `createOrder()` and `updateOrder()` to include `delivery_person_id`.

### 3. Frontend Changes

#### `resources/js/pages/Orders/OrderForm.jsx`

**Added State:**
```javascript
const [deliveryPersons, setDeliveryPersons] = useState([]);

const [formData, setFormData] = useState({
    // ... other fields
    delivery_agent_id: '',
    delivery_person_id: '',  // New field
    confirmation_agent_id: '',
    // ... other fields
});
```

**Added Fetch Function:**
```javascript
const fetchDeliveryPersons = async () => {
    try {
        const response = await api.get('/delivery-persons');
        setDeliveryPersons(response.data);
    } catch (error) {
        console.error('Error fetching delivery persons:', error);
    }
};
```

**Added Form Fields:**
```jsx
<div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
        Delivery Agent
    </label>
    <select
        value={formData.delivery_agent_id}
        onChange={(e) => setFormData({ ...formData, delivery_agent_id: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
    >
        <option value="">Select Delivery Agent</option>
        {deliveryAgents.map(agent => (
            <option key={agent.id} value={agent.id}>{agent.name}</option>
        ))}
    </select>
    <p className="text-xs text-gray-500 mt-1">
        Responsible for managing the delivery
    </p>
</div>

<div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
        Delivery Person
    </label>
    <select
        value={formData.delivery_person_id}
        onChange={(e) => setFormData({ ...formData, delivery_person_id: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
    >
        <option value="">Select Delivery Person</option>
        {deliveryPersons.map(person => (
            <option key={person.id} value={person.id}>{person.name}</option>
        ))}
    </select>
    <p className="text-xs text-gray-500 mt-1">
        Person who physically delivers the product
    </p>
</div>
```

#### `resources/js/pages/Orders/OrderList.jsx`

**Updated Table Headers:**
```jsx
<th>Delivery Agent</th>
<th>Delivery Person</th>
<th>Agent Conf.</th>
```

**Updated Table Data:**
```jsx
<td>{order.delivery_agent?.name || '-'}</td>
<td>{order.delivery_person?.name || '-'}</td>
<td>{order.confirmation_agent?.name || '-'}</td>
```

#### `resources/js/pages/Orders/OrderDetail.jsx`

**Updated Agents Section:**
```jsx
{/* Delivery & Confirmation Agents */}
{(order.delivery_agent || order.delivery_person || order.confirmation_agent) && (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <UserCheck className="mr-2" size={20} />
            Agents & Delivery
        </h2>
        <div className="space-y-3">
            {order.delivery_agent && (
                <div>
                    <p className="text-sm text-gray-500">Delivery Agent</p>
                    <p className="font-semibold text-gray-900">{order.delivery_agent.name}</p>
                    <p className="text-xs text-gray-400">Responsible for managing delivery</p>
                </div>
            )}
            {order.delivery_person && (
                <div>
                    <p className="text-sm text-gray-500">Delivery Person</p>
                    <p className="font-semibold text-gray-900">{order.delivery_person.name}</p>
                    <p className="text-xs text-gray-400">Physically delivers the product</p>
                </div>
            )}
            {order.confirmation_agent && (
                <div>
                    <p className="text-sm text-gray-500">Confirmation Agent</p>
                    <p className="font-semibold text-gray-900">{order.confirmation_agent.name}</p>
                </div>
            )}
        </div>
    </div>
)}
```

## Order Creation Form Layout

```
┌─────────────────────────────────────────────────┐
│ Agent Confirmation                              │
│ [Select Agent ▼]                                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Delivery Agent                                  │
│ [Select Delivery Agent ▼]                       │
│ ℹ️ Responsible for managing the delivery        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Delivery Person                                 │
│ [Select Delivery Person ▼]                      │
│ ℹ️ Person who physically delivers the product   │
└─────────────────────────────────────────────────┘
```

## Order List Table Columns

| Date | ID | Client | ... | Status | **Delivery Agent** | **Delivery Person** | **Agent Conf.** | WhatsApp | Actions |
|------|-------|--------|-----|--------|-------------------|-------------------|----------------|----------|---------|
| ... | ... | ... | ... | ... | Agent Livraison 1 | Delivery Person 1 | Agent Confirmation 1 | ... | ... |

## Order Detail Page

**Agents & Delivery Section:**
```
┌─────────────────────────────────────┐
│ Agents & Delivery                   │
│                                     │
│ Delivery Agent                      │
│ Agent Livraison 1                   │
│ ℹ️ Responsible for managing delivery │
│                                     │
│ Delivery Person                     │
│ Delivery Person 1                   │
│ ℹ️ Physically delivers the product  │
│                                     │
│ Confirmation Agent                  │
│ Agent Confirmation 1                │
└─────────────────────────────────────┘
```

## Usage Workflow

### Creating an Order:

1. **Select Agent Confirmation**
   - Choose the agent who will confirm the order

2. **Select Delivery Agent**
   - Choose the person responsible for managing this delivery
   - This is typically a logistics coordinator or manager

3. **Select Delivery Person**
   - Choose the person who will physically deliver the product
   - This is the driver/courier who goes to the customer

4. **Complete Order**
   - Both fields are optional
   - Can assign one, both, or neither

### Viewing Orders:

- **Order List:** Shows both Delivery Agent and Delivery Person columns
- **Order Detail:** Shows both with clear descriptions of their roles

## User Roles Summary

| Role | Slug | Purpose | Shows In |
|------|------|---------|----------|
| Agent Confirmation | `agent_confirmation` | Confirms orders | Agent Confirmation dropdown |
| Agent Livraison | `agent_livraison` | Manages deliveries | Delivery Agent dropdown |
| Delivery | `delivery` | Delivers products | Delivery Person dropdown |

## Database Schema

```sql
CREATE TABLE orders (
    -- ... other columns
    delivery_agent_id BIGINT UNSIGNED NULL,
    delivery_person_id BIGINT UNSIGNED NULL,
    confirmation_agent_id BIGINT UNSIGNED NULL,
    -- ... other columns
    
    FOREIGN KEY (delivery_agent_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (delivery_person_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (confirmation_agent_id) REFERENCES users(id) ON DELETE SET NULL
);
```

## Testing

### Test 1: Create Order with Both Agents
1. Go to Orders → Create Order
2. Select a Delivery Agent (e.g., Agent Livraison 1)
3. Select a Delivery Person (e.g., Delivery Person 1)
4. **Expected:** Both saved and displayed in order list and detail

### Test 2: Edit Order - Change Delivery Person
1. Edit an existing order
2. Change the Delivery Person
3. Save
4. **Expected:** New delivery person is displayed

### Test 3: View Order List
1. Go to Orders list
2. **Expected:** See separate columns for Delivery Agent and Delivery Person
3. **Expected:** Both show correct names or "-" if not assigned

## Files Modified

- `database/migrations/2026_02_18_173249_add_delivery_person_id_to_orders_table.php` (New)
- `app/Models/Order.php`
- `app/Http/Controllers/OrderController.php`
- `app/Http/Controllers/UserController.php`
- `app/Services/OrderService.php`
- `routes/api.php`
- `resources/js/pages/Orders/OrderForm.jsx`
- `resources/js/pages/Orders/OrderList.jsx`
- `resources/js/pages/Orders/OrderDetail.jsx`

## Notes

- Both `delivery_agent_id` and `delivery_person_id` are **nullable** - you can assign one, both, or neither
- The system protects data integrity with foreign key constraints
- Deleting a user sets their assigned orders to NULL (prevents orphaned records)
- Helper text clarifies the distinction between the two roles
- The print version also includes both agents with descriptions

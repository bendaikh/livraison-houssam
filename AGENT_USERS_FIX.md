# Agent Users Creation Fix

## Issue
When creating an order, the "Agent Confirmation" and "Delivery Agent" dropdowns were showing "No agents" even though users were visible in the Users section.

## Root Cause
The agent roles (`agent_confirmation`, `agent_livraison`, and `delivery`) existed in the database, but no users were assigned to these roles. The dropdowns filter users by specific role slugs, so without users assigned to these roles, the dropdowns appeared empty.

## Solution
Created an Artisan command to automatically create agent users with the correct roles.

### Command Created

**File:** `app/Console/Commands/CreateAgentUsers.php`

**Command:** `php artisan agents:create`

### What the Command Does

1. **Checks for Required Roles:**
   - `agent_confirmation` - For confirmation agents
   - `agent_livraison` - For delivery agents (livraison)
   - `delivery` - For delivery personnel

2. **Creates Missing Roles:**
   - If any role is missing, it creates them automatically with appropriate permissions

3. **Creates Agent Users:**
   - 2 Confirmation Agents
   - 2 Delivery Agents (Livraison)
   - 2 Delivery Personnel

### Agent Users Created

| Email | Name | Role | Phone | Password |
|-------|------|------|-------|----------|
| confirmation1@example.com | Agent Confirmation 1 | agent_confirmation | +212 600 111 111 | password |
| confirmation2@example.com | Agent Confirmation 2 | agent_confirmation | +212 600 222 222 | password |
| livraison1@example.com | Agent Livraison 1 | agent_livraison | +212 600 333 333 | password |
| livraison2@example.com | Agent Livraison 2 | agent_livraison | +212 600 444 444 | password |
| delivery1@example.com | Delivery Person 1 | delivery | +212 600 555 555 | password |
| delivery2@example.com | Delivery Person 2 | delivery | +212 600 666 666 | password |

## How It Works

### API Endpoints
The order form fetches agents from these endpoints:

1. **`GET /api/confirmation-agents`**
   - Returns users with role slug: `agent_confirmation`
   - Active users only

2. **`GET /api/delivery-agents`**
   - Returns users with role slugs: `agent_livraison` OR `delivery`
   - Active users only

### Controller Methods

**File:** `app/Http/Controllers/UserController.php`

```php
public function deliveryAgents()
{
    $agents = User::whereHas('role', function ($query) {
        $query->whereIn('slug', ['agent_livraison', 'delivery']);
    })->where('is_active', true)->get();

    return response()->json($agents);
}

public function confirmationAgents()
{
    $agents = User::whereHas('role', function ($query) {
        $query->where('slug', 'agent_confirmation');
    })->where('is_active', true)->get();

    return response()->json($agents);
}
```

## Verification Steps

### 1. Check Agent Creation
```bash
php artisan agents:create
```

**Expected Output:**
```
Creating agent users...
✓ Created/Updated: Agent Confirmation 1
✓ Created/Updated: Agent Confirmation 2
✓ Created/Updated: Agent Livraison 1
✓ Created/Updated: Agent Livraison 2
✓ Created/Updated: Delivery Person 1
✓ Created/Updated: Delivery Person 2

✅ Agent users created successfully!

Summary:
- Confirmation Agents: 2
- Delivery Agents (Livraison): 2
- Delivery Personnel: 2
```

### 2. Verify in Browser
1. Navigate to **Orders → Create Order**
2. Check the **Agent Confirmation** dropdown
   - **Expected:** See "Agent Confirmation 1" and "Agent Confirmation 2"
3. Check the **Delivery Agent** dropdown
   - **Expected:** See "Agent Livraison 1", "Agent Livraison 2", "Delivery Person 1", "Delivery Person 2"

### 3. Verify in Users Section
1. Navigate to **Users** (admin only)
2. **Expected:** See all 6 agent users listed with their respective roles

## Adding More Agents

### Option 1: Using the Command (Modify the Command)
Edit `app/Console/Commands/CreateAgentUsers.php` and add more users, then run:
```bash
php artisan agents:create
```

### Option 2: Through the UI
1. Go to **Users** section
2. Click **Create User**
3. Fill in the details
4. Select role:
   - **Agent Confirmation** for confirmation agents
   - **Agent Livraison** for delivery agents
5. Set **Is Active** to true
6. Save

### Option 3: Programmatically
```php
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

$role = Role::where('slug', 'agent_confirmation')->first();

User::create([
    'name' => 'Agent Confirmation 3',
    'email' => 'confirmation3@example.com',
    'password' => Hash::make('password'),
    'role_id' => $role->id,
    'is_active' => true,
    'phone' => '+212 600 777 777',
]);
```

## Important Notes

1. **Command is Idempotent:**
   - Running `php artisan agents:create` multiple times won't create duplicates
   - Uses `updateOrCreate` to update existing users if they already exist

2. **Active Status:**
   - Only users with `is_active = true` appear in the dropdowns
   - If an agent is deactivated, they won't show up in order forms

3. **Role Slugs:**
   - The system looks for specific role slugs:
     - `agent_confirmation` - For confirmation agents
     - `agent_livraison` OR `delivery` - For delivery agents
   - Make sure users have the correct role assigned

4. **Permissions:**
   - Confirmation Agents: Can view/confirm orders, view clients, view products
   - Delivery Agents: Can view orders, update order status, view clients
   - Delivery Personnel: Can view assigned orders, update delivery status

## Troubleshooting

### Problem: Dropdowns still empty after running command

**Check 1: Verify users were created**
```bash
php artisan tinker
>>> User::whereHas('role', fn($q) => $q->where('slug', 'agent_confirmation'))->count();
```
Should return 2 or more.

**Check 2: Verify users are active**
```bash
>>> User::whereHas('role', fn($q) => $q->where('slug', 'agent_confirmation'))->where('is_active', true)->count();
```

**Check 3: Check browser console**
Open DevTools → Network tab → Look for `/api/confirmation-agents` and `/api/delivery-agents` requests
Should return JSON with user arrays.

**Check 4: Clear browser cache**
Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### Problem: "Role not found" error

Run database seeder to create roles:
```bash
php artisan db:seed --class=DatabaseSeeder
```

Or the command will create them automatically.

## Related Files

- **`app/Console/Commands/CreateAgentUsers.php`** - Command to create agents
- **`app/Http/Controllers/UserController.php`** - API endpoints for agents
- **`routes/api.php`** - Agent routes (lines 92-93)
- **`resources/js/pages/Orders/OrderForm.jsx`** - Order form that uses agents
- **`database/seeders/DatabaseSeeder.php`** - Initial roles and users seeder

## Default Credentials

All agent users created by the command have:
- **Password:** `password`
- **Status:** Active

⚠️ **Security Note:** Change these passwords in production!

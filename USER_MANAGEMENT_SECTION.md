# User Management Section in Sidebar

## Changes Made

Added a new **User Management** section in the sidebar with Users and Roles as subsections, improving the organization of user and role management features.

## What Was Added

### 1. New Sidebar Section: User Management

**Location:** Sidebar navigation (between API Integrations and Settings)

**Structure:**
```
📁 User Management
  ├── 👥 Users
  └── 🛡️ Roles
```

### 2. New Page: Role List

Created a new Roles page to display and manage user roles.

**Features:**
- View all roles in a card grid layout
- Each role card shows:
  - Role name and slug
  - Description
  - Number of permissions
  - Number of users assigned
- Edit and Delete actions
- Protected delete for system roles (admin, superadmin)
- Create new role button

## Files Modified

### 1. `resources/js/layouts/MainLayout.jsx`

#### Added Icons Import:
```javascript
import { 
    // ... existing icons
    Shield, UserCog  // New icons for roles and user management
} from 'lucide-react';
```

#### Added State:
```javascript
const [userManagementExpanded, setUserManagementExpanded] = useState(true);
```

#### Updated Menu Items:
```javascript
// Removed standalone Users item
// { path: '/users', icon: Users, label: 'Users', description: 'User management', adminOnly: true },

// Added new User Management section with subsections
{ 
    path: '/user-management', 
    icon: UserCog, 
    label: 'User Management', 
    description: 'Users & Roles',
    hasSubItems: true,
    adminOnly: true,
    subItems: [
        { path: '/users', icon: Users, label: 'Users', description: 'Manage users' },
        { path: '/roles', icon: Shield, label: 'Roles', description: 'Manage roles' }
    ]
},
```

#### Updated Expansion Logic:
```javascript
const isExpanded = item.label === 'Products' 
    ? productsExpanded 
    : item.label === 'Expenses' 
        ? expensesExpanded 
        : item.label === 'User Management'    // New condition
            ? userManagementExpanded
            : apiIntegrationsExpanded;

const toggleExpanded = item.label === 'Products' 
    ? () => setProductsExpanded(!productsExpanded)
    : item.label === 'Expenses'
        ? () => setExpensesExpanded(!expensesExpanded)
        : item.label === 'User Management'    // New condition
            ? () => setUserManagementExpanded(!userManagementExpanded)
            : () => setApiIntegrationsExpanded(!apiIntegrationsExpanded);
```

### 2. `resources/js/pages/Roles/RoleList.jsx` (New File)

Complete role listing component with:
- Fetch roles from `/api/roles`
- Display roles in a responsive grid (1-3 columns)
- Card-based UI with role information
- Edit and Delete actions
- Loading and empty states

**Key Features:**
```javascript
// Fetch roles
const fetchRoles = async () => {
    const response = await api.get('/roles');
    setRoles(response.data.data || response.data);
};

// Delete role (with protection)
const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    await api.delete(`/roles/${id}`);
    fetchRoles();
};
```

### 3. `resources/js/app.jsx`

#### Added Import:
```javascript
// Roles
import RoleList from './pages/Roles/RoleList';
```

#### Added Route:
```javascript
{/* Users & Roles */}
<Route path="users" element={<UserList />} />
<Route path="roles" element={<RoleList />} />  {/* New route */}
```

## UI/UX Improvements

### Sidebar Organization
**Before:**
```
📊 Dashboard
📦 Products
  ├── List Products
  └── Categories
🛒 Marketplace
📦 Stock
🛍️ Orders
👥 Clients
🏪 Sellers
💰 Expenses
  ├── List Expenses
  └── Expense Categories
🔗 API Integrations
  ├── Shopify
  ├── Tawsilex
  └── BMDelivery
👤 Users          <- Standalone item
⚙️ Settings
```

**After:**
```
📊 Dashboard
📦 Products
  ├── List Products
  └── Categories
🛒 Marketplace
📦 Stock
🛍️ Orders
👥 Clients
🏪 Sellers
💰 Expenses
  ├── List Expenses
  └── Expense Categories
🔗 API Integrations
  ├── Shopify
  ├── Tawsilex
  └── BMDelivery
👤 User Management    <- New expandable section
  ├── Users
  └── Roles
⚙️ Settings
```

### Benefits:
1. **Better Organization:** Related features grouped together
2. **Scalability:** Easy to add more user-related features (e.g., Permissions, Activity Logs)
3. **Consistency:** Matches the pattern used for Products, Expenses, and API Integrations
4. **Clarity:** Clear separation between user management and other features

## Access Control

- **Visibility:** Only visible to Admin and SuperAdmin users
- **Permission Check:** Uses `adminOnly: true` flag
- **Role Check:** `['admin', 'superadmin'].includes(user?.role?.slug)`

## API Endpoints Used

### Roles API
- `GET /api/roles` - List all roles
- `DELETE /api/roles/{id}` - Delete a role

These endpoints already exist in the backend via `apiResource`.

## Usage

### For Admins/SuperAdmins:

1. **Navigate to User Management:**
   - Click "User Management" in the sidebar
   - Section expands to show Users and Roles

2. **View Users:**
   - Click "Users" subsection
   - Redirects to `/users` (existing functionality)

3. **View Roles:**
   - Click "Roles" subsection
   - Redirects to `/roles` (new page)
   - See all roles in a grid layout
   - Edit or delete roles as needed

### Expanding/Collapsing:
- Click the "User Management" section to toggle expansion
- Chevron icon rotates to indicate state
- Defaults to expanded on page load

## Future Enhancements

Potential additions to the User Management section:
- **Permissions** - Detailed permission management
- **Activity Logs** - User activity tracking
- **Sessions** - Active user sessions
- **API Tokens** - Personal access tokens
- **Teams** - Team/group management

## Testing Checklist

- [x] User Management section appears in sidebar (admin only)
- [x] Section can be expanded/collapsed
- [x] Users subsection navigates to `/users`
- [x] Roles subsection navigates to `/roles`
- [x] Roles page displays all roles
- [x] Role cards show correct information
- [x] Edit button works (redirects to edit page)
- [x] Delete button works (with confirmation)
- [x] System roles (admin, superadmin) protected from deletion
- [x] Empty state displays when no roles exist
- [x] Loading state displays while fetching
- [x] Responsive layout (1-3 columns)
- [x] Frontend builds successfully

## Notes

- **No Backend Changes:** All backend functionality already exists
- **Backward Compatible:** Existing `/users` route still works
- **Admin Only:** Non-admin users won't see this section
- **Expandable by Default:** Section starts expanded for easier access
- **Icon Consistency:** Uses lucide-react icons matching the design system

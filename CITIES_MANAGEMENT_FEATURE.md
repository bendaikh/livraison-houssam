# Cities Management Feature

## Date: February 23, 2026

## Overview
Added a comprehensive cities management system that allows admins to configure cities with their delivery costs, and automatically populate city selection in order creation.

## Features Implemented

### 1. Cities Management in Settings ✅

**What:** A new "Cities" tab in the Settings page where admins can:
- View all cities in a table format
- Add new cities with delivery costs
- Edit existing cities
- Delete cities
- Toggle city active/inactive status

**Location:** Settings → Cities tab

**Features:**
- **City Name** - Unique name for each city
- **Delivery Cost** - Cost to deliver to that city
- **Status** - Active/Inactive toggle
- Modal form for adding/editing cities
- Real-time table updates
- Confirmation dialog before deletion

### 2. City Selection in Order Creation ✅

**What:** The city field in order creation is now a dropdown that:
- Shows all active cities
- Displays city name and delivery cost
- **Auto-fills shipping cost** when a city is selected
- Replaces the old text input field

**Location:** Orders → Create Order / Edit Order

**How it works:**
1. User selects a city from the dropdown
2. System automatically sets the shipping cost to that city's delivery cost
3. User can still manually adjust the shipping cost if needed

## Database Structure

### Cities Table
```sql
cities
- id (primary key)
- name (string, unique)
- delivery_cost (decimal 10,2)
- is_active (boolean, default: true)
- created_at (timestamp)
- updated_at (timestamp)
```

## API Endpoints

### Cities API
- `GET /api/cities` - List all cities
- `POST /api/cities` - Create a new city
- `GET /api/cities/{id}` - Get a specific city
- `PUT /api/cities/{id}` - Update a city
- `DELETE /api/cities/{id}` - Delete a city

**Request Example (Create City):**
```json
{
  "name": "Casablanca",
  "delivery_cost": 50.00,
  "is_active": true
}
```

**Response Example:**
```json
{
  "id": 1,
  "name": "Casablanca",
  "delivery_cost": "50.00",
  "is_active": true,
  "created_at": "2026-02-23T15:30:00.000000Z",
  "updated_at": "2026-02-23T15:30:00.000000Z"
}
```

## Files Created/Modified

### Backend Files Created:
1. `database/migrations/2026_02_23_151438_create_cities_table.php` - Database migration
2. `app/Models/City.php` - City model
3. `app/Http/Controllers/CityController.php` - Cities API controller

### Backend Files Modified:
1. `routes/api.php` - Added cities routes

### Frontend Files Modified:
1. `resources/js/pages/Settings/Settings.jsx` - Added Cities tab
2. `resources/js/pages/Orders/OrderForm.jsx` - Changed city field to dropdown

## Usage Instructions

### For Administrators:

#### Adding Cities:
1. Go to **Settings**
2. Click on the **Cities** tab
3. Click **"Add City"** button
4. Fill in:
   - City Name (e.g., "Casablanca")
   - Delivery Cost (e.g., "50.00")
   - Active checkbox (checked by default)
5. Click **"Add"**

#### Editing Cities:
1. In the Cities table, click the **Edit icon** (pencil)
2. Modify the city details
3. Click **"Update"**

#### Deleting Cities:
1. In the Cities table, click the **Delete icon** (trash)
2. Confirm the deletion
3. City will be removed

**Note:** Deleting a city won't affect existing orders that use that city name.

### For All Users (Creating Orders):

#### Using Cities in Orders:
1. Go to **Orders → Create Order**
2. Find the **City** dropdown field
3. Select a city from the list
   - You'll see: "City Name - XX DH"
4. **Shipping Cost auto-fills** with the city's delivery cost
5. You can manually adjust the shipping cost if needed
6. Complete the rest of the order form
7. Submit

## Benefits

### 1. **Standardized Cities**
- Prevents typos and inconsistent city names
- Easy to filter and report by city

### 2. **Automatic Pricing**
- Delivery costs are automatically applied
- Reduces manual entry errors
- Saves time when creating orders

### 3. **Centralized Management**
- Update delivery costs in one place
- Changes immediately reflected in order creation
- Easy to add new cities as business expands

### 4. **Better Reporting**
- Consistent city names enable accurate reports
- Can track delivery costs per city
- Analyze order volumes by location

## Technical Details

### Auto-fill Shipping Cost Logic:
```javascript
onChange={(e) => {
    const selectedCity = cities.find(c => c.name === e.target.value);
    setFormData({ 
        ...formData, 
        city: e.target.value,
        shipping_cost: selectedCity ? selectedCity.delivery_cost : formData.shipping_cost
    });
}}
```

### Only Active Cities Shown:
```javascript
const fetchCities = async () => {
    const response = await api.get('/cities');
    setCities(response.data.filter(city => city.is_active));
};
```

## Migration

To run the migration:
```bash
php artisan migrate
```

## Testing

### Test Cities Management:
1. ✅ Add a new city (e.g., "Casablanca" - 50 DH)
2. ✅ Add another city (e.g., "Rabat" - 45 DH)
3. ✅ Edit a city's delivery cost
4. ✅ Toggle city active/inactive status
5. ✅ Delete a city (with confirmation)
6. ✅ Verify cities appear in table

### Test Order Creation:
1. ✅ Go to Create Order
2. ✅ City field shows as dropdown
3. ✅ Select "Casablanca - 50 DH"
4. ✅ Shipping cost auto-fills to 50
5. ✅ Change city to "Rabat - 45 DH"
6. ✅ Shipping cost updates to 45
7. ✅ Can manually override shipping cost
8. ✅ Submit order successfully

### Test Inactive Cities:
1. ✅ Mark a city as inactive in Settings
2. ✅ Go to Create Order
3. ✅ Inactive city should NOT appear in dropdown
4. ✅ Reactivate city
5. ✅ City reappears in dropdown

## Future Enhancements (Optional)

### Possible Additions:
- **Zones/Regions** - Group cities into delivery zones
- **Multiple Delivery Services** - Different costs per carrier per city
- **Delivery Time Estimates** - Expected delivery days per city
- **City Aliases** - Handle multiple spellings of same city
- **Bulk Import** - Upload CSV of cities
- **City History** - Track delivery cost changes over time

## Build Status

✅ **Migration successful** - Cities table created
✅ **API endpoints working** - Full CRUD operations
✅ **Frontend built successfully** - No errors
✅ **Cities tab added** - Visible in Settings
✅ **Order form updated** - Dropdown working with auto-fill

## Summary

The Cities Management feature provides a complete solution for:
1. ✅ Managing cities and delivery costs in Settings
2. ✅ Using cities in order creation with auto-pricing
3. ✅ Standardizing city names across the system
4. ✅ Improving efficiency and reducing errors

**Status:** Complete and ready to use! 🎉

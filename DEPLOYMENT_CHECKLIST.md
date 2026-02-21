# 🚀 Deployment Checklist

## Pre-Deployment

### ✅ Code Changes Completed
- [x] Backend controllers updated with vendor filtering
- [x] Frontend menu updated with role restrictions
- [x] Models updated with relationships
- [x] Migrations created
- [x] Frontend assets built

### ✅ Documentation Created
- [x] VENDOR_ROLE_SYSTEM.md - Technical documentation
- [x] IMPLEMENTATION_SUMMARY.md - Implementation details
- [x] VENDOR_QUICK_START.md - User guide
- [x] COMPLETE_IMPLEMENTATION.md - Completion report
- [x] ARCHITECTURE_DIAGRAM.md - System architecture
- [x] DEPLOYMENT_CHECKLIST.md - This file

---

## Deployment Steps

### Step 1: Backup Database ⚠️
```bash
# Create backup before running migrations
php artisan db:backup
# Or manually:
mysqldump -u [username] -p [database_name] > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run Migrations
```bash
php artisan migrate
```

**Expected Output:**
```
Migration table created successfully.
Migrating: 2026_02_21_180531_add_user_id_to_vendors_table
Migrated:  2026_02_21_180531_add_user_id_to_vendors_table (XX ms)
Migrating: 2026_02_21_182340_add_vendor_id_to_api_integrations_table
Migrated:  2026_02_21_182340_add_vendor_id_to_api_integrations_table (XX ms)
```

### Step 3: Verify Migrations
```bash
# Check if columns were added
php artisan tinker
```

In Tinker:
```php
// Check vendors table
Schema::hasColumn('vendors', 'user_id');
// Should return: true

// Check api_integrations table
Schema::hasColumn('api_integrations', 'vendor_id');
// Should return: true

exit;
```

### Step 4: Verify Vendor Role Exists
```bash
php artisan tinker
```

In Tinker:
```php
// Check if vendor role exists
$vendorRole = App\Models\Role::where('slug', 'vendor')->first();
echo $vendorRole ? "Vendor role exists" : "Vendor role MISSING!";

// If missing, create it:
if (!$vendorRole) {
    App\Models\Role::create([
        'name' => 'Vendor',
        'slug' => 'vendor',
        'description' => 'Vendor role with restricted access'
    ]);
    echo "Vendor role created!";
}

exit;
```

### Step 5: Clear Cache
```bash
# Clear all Laravel caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan optimize:clear
```

### Step 6: Deploy Frontend Assets
```bash
# Assets should already be built from npm run build
# If not, run:
npm run build

# Verify build files exist
ls -la public/build/assets/
```

**Expected Files:**
- `app-BzU2-gJh.js`
- `app-C5a8TvcG.css`
- `manifest.json`

---

## Post-Deployment Testing

### Test 1: Create Vendor with Login ✅

**As Admin:**
1. Login to application
2. Navigate to "Sellers" page
3. Click "Add Seller"
4. Fill form:
   - Name: `Test Vendor`
   - Email: `vendor@test.com`
   - Password: `password123`
   - Confirm Password: `password123`
   - Phone: `1234567890`
   - Address: `123 Test St`
   - Commission Rate: `10`
5. Click "Save"

**Expected Result:**
- ✅ Success message displayed
- ✅ Vendor appears in vendors list
- ✅ User account created in users table
- ✅ User has role "vendor"

**Verification SQL:**
```sql
-- Check user was created
SELECT u.id, u.name, u.email, r.slug as role 
FROM users u 
LEFT JOIN roles r ON u.role_id = r.id 
WHERE u.email = 'vendor@test.com';

-- Check vendor was linked
SELECT v.id, v.name, v.user_id 
FROM vendors v 
LEFT JOIN users u ON v.user_id = u.id 
WHERE u.email = 'vendor@test.com';
```

### Test 2: Vendor Login ✅

1. Logout from admin account
2. Go to login page
3. Enter:
   - Email: `vendor@test.com`
   - Password: `password123`
4. Click "Login"

**Expected Result:**
- ✅ Successfully logged in
- ✅ Redirected to dashboard
- ✅ See simplified menu (no Products, Stock, Expenses, etc.)

### Test 3: Vendor Menu Restrictions ✅

**Check Menu Items Visible:**
- ✅ Dashboard
- ✅ Marketplace
- ✅ Orders
- ✅ API Integrations (with only Shopify submenu)
- ✅ Settings

**Check Menu Items Hidden:**
- ❌ Products
- ❌ Stock
- ❌ Sellers
- ❌ Expenses
- ❌ User Management
- ❌ Tawsilex (in API Integrations)
- ❌ BMDelivery (in API Integrations)

### Test 4: Dashboard Data Filtering ✅

**As Vendor:**
1. Go to Dashboard
2. Check statistics displayed

**Expected Behavior:**
- ✅ Sales show only vendor's sales
- ✅ Orders show only vendor's orders
- ✅ Charts display only vendor's data
- ✅ Top products show only products vendor sold
- ✅ Recent orders show only vendor's orders

**No Admin Data:**
- ❌ No expense statistics
- ❌ No low stock products
- ❌ No other vendors' data

### Test 5: Orders Filtering ✅

**As Vendor:**
1. Go to Orders page
2. View orders list

**Expected Behavior:**
- ✅ Only see orders assigned to this vendor
- ✅ Cannot see other vendors' orders
- ✅ Search and filter work correctly
- ✅ Order details accessible

**Verification SQL:**
```sql
-- Get vendor ID
SELECT v.id 
FROM vendors v 
LEFT JOIN users u ON v.user_id = u.id 
WHERE u.email = 'vendor@test.com';
-- Note the vendor ID (e.g., 5)

-- Check orders (should only return vendor's orders)
SELECT id, order_number, vendor_id, total 
FROM orders 
WHERE vendor_id = 5;
-- All orders should have vendor_id = 5
```

### Test 6: Marketplace Filtering ✅

**As Admin (First):**
1. Login as admin
2. Go to Marketplace
3. Assign some products to the test vendor
4. Logout

**As Vendor:**
1. Login as vendor
2. Go to Marketplace
3. View products list

**Expected Behavior:**
- ✅ Only see products assigned to vendor
- ✅ Cannot see unassigned products
- ✅ Product details visible

### Test 7: API Integrations Filtering ✅

**As Vendor:**
1. Go to API Integrations
2. Check available integrations

**Expected Behavior:**
- ✅ See "Shopify" in menu
- ✅ Can click on Shopify
- ✅ Can configure Shopify connection
- ❌ No Tawsilex option
- ❌ No BMDelivery option

### Test 8: Security Testing ✅

**Try Direct API Access:**
```bash
# Get vendor's auth token first
TOKEN="<vendor_auth_token>"

# Try to access all orders (should be filtered)
curl -H "Authorization: Bearer $TOKEN" \
     https://yourdomain.com/api/orders

# Try to access all products (should be blocked or filtered)
curl -H "Authorization: Bearer $TOKEN" \
     https://yourdomain.com/api/products

# Try to access vendors list (should be blocked)
curl -H "Authorization: Bearer $TOKEN" \
     https://yourdomain.com/api/vendors

# Try to access expenses (should be blocked)
curl -H "Authorization: Bearer $TOKEN" \
     https://yourdomain.com/api/expenses
```

**Expected Results:**
- ✅ /api/orders - Returns only vendor's orders
- ❌ /api/products - Returns 403 or empty (blocked)
- ❌ /api/vendors - Returns 403 or empty (blocked)
- ❌ /api/expenses - Returns 403 or empty (blocked)

### Test 9: Admin Can Still See Everything ✅

**As Admin:**
1. Login as admin
2. Navigate through all pages

**Expected Behavior:**
- ✅ Can see all menu items
- ✅ Can see all orders (from all vendors)
- ✅ Can see all products
- ✅ Can see all vendors
- ✅ Can see all expenses
- ✅ Can see all integrations

---

## Rollback Plan (If Needed)

### Option 1: Rollback Migrations
```bash
# Rollback last 2 migrations
php artisan migrate:rollback --step=2
```

### Option 2: Restore Database Backup
```bash
# Restore from backup
mysql -u [username] -p [database_name] < backup_YYYYMMDD_HHMMSS.sql
```

### Option 3: Revert Frontend Assets
```bash
# If needed, restore old build files
git checkout HEAD~1 -- public/build/
```

---

## Common Issues & Solutions

### Issue 1: Migration Fails
**Error:** `SQLSTATE[42000]: Syntax error`

**Solution:**
- Check database connection in `.env`
- Verify MySQL version supports foreign keys
- Check if tables exist:
  ```bash
  php artisan tinker
  Schema::hasTable('vendors');
  Schema::hasTable('api_integrations');
  ```

### Issue 2: Vendor Role Not Found
**Error:** `Role 'vendor' not found`

**Solution:**
```bash
php artisan tinker
App\Models\Role::create(['name' => 'Vendor', 'slug' => 'vendor']);
```

### Issue 3: Vendor Can Still See Admin Pages
**Problem:** Vendor sees Products, Expenses, etc.

**Solution:**
- Clear browser cache: Ctrl+Shift+Delete
- Clear Laravel cache: `php artisan cache:clear`
- Rebuild frontend: `npm run build`
- Hard refresh: Ctrl+Shift+R

### Issue 4: Vendor Sees All Orders
**Problem:** Vendor sees orders from other vendors

**Solution:**
- Check if vendor has `user_id` set:
  ```sql
  SELECT * FROM vendors WHERE user_id IS NULL;
  ```
- If NULL, update manually:
  ```sql
  UPDATE vendors v
  JOIN users u ON u.email = v.email
  SET v.user_id = u.id
  WHERE v.user_id IS NULL;
  ```

### Issue 5: Cannot Create Vendor
**Error:** `Column 'user_id' cannot be null`

**Solution:**
- Check if migration ran: `php artisan migrate:status`
- If not, run: `php artisan migrate`
- Verify column exists:
  ```sql
  DESCRIBE vendors;
  ```

---

## Performance Checks

### After Deployment, Monitor:

1. **Query Performance**
   ```bash
   # Enable query logging
   php artisan tinker
   DB::enableQueryLog();
   # Make some requests
   DB::getQueryLog();
   ```

2. **Page Load Times**
   - Dashboard should load in < 2 seconds
   - Orders list should load in < 2 seconds
   - Marketplace should load in < 2 seconds

3. **Database Indexes**
   ```sql
   -- Check if indexes exist
   SHOW INDEXES FROM orders WHERE Key_name LIKE '%vendor_id%';
   SHOW INDEXES FROM api_integrations WHERE Key_name LIKE '%vendor_id%';
   
   -- If missing, add them:
   ALTER TABLE orders ADD INDEX idx_vendor_id (vendor_id);
   ALTER TABLE api_integrations ADD INDEX idx_vendor_id (vendor_id);
   ```

---

## Final Checklist

### Pre-Production
- [ ] Database backed up
- [ ] Migrations run successfully
- [ ] Vendor role created
- [ ] Caches cleared
- [ ] Frontend assets built

### Testing
- [ ] Admin can create vendor with login
- [ ] Vendor can login
- [ ] Vendor menu shows only allowed items
- [ ] Vendor dashboard filtered
- [ ] Vendor orders filtered
- [ ] Vendor marketplace filtered
- [ ] Vendor API integrations filtered
- [ ] Admin still has full access
- [ ] Security tests passed

### Documentation
- [ ] Team informed of changes
- [ ] User guide shared with vendors
- [ ] Admin guide updated
- [ ] Support team trained

### Monitoring
- [ ] Error logs monitored
- [ ] Performance metrics tracked
- [ ] User feedback collected

---

## Success Criteria

✅ **System is ready for production when:**

1. Vendor can login with email/password
2. Vendor sees only their own data
3. Vendor cannot access admin features
4. Admin retains full access
5. No errors in logs
6. Performance is acceptable
7. All tests passed

---

## Support & Documentation

**Technical Documentation:**
- `VENDOR_ROLE_SYSTEM.md` - Complete technical guide
- `ARCHITECTURE_DIAGRAM.md` - System architecture

**User Guides:**
- `VENDOR_QUICK_START.md` - Quick start for vendors

**Implementation:**
- `IMPLEMENTATION_SUMMARY.md` - What was changed
- `COMPLETE_IMPLEMENTATION.md` - Completion report

---

## Contact

If you encounter issues during deployment:
1. Check this deployment checklist
2. Review error logs: `storage/logs/laravel.log`
3. Check the documentation files listed above

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Status:** ⬜ Successful  ⬜ Failed  ⬜ Rolled Back  
**Notes:** _____________________________________________

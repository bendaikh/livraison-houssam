# Quick Start Guide: Vendor Role

## For Administrators

### Creating a Vendor with Login Access

1. **Navigate to Sellers:**
   - Click on "Sellers" in the sidebar

2. **Add New Seller:**
   - Click "Add Seller" button
   - Fill in vendor information:
     - Name
     - Email (this will be their login username)
     - **Password** (new field)
     - **Confirm Password** (new field)
     - Phone, address, commission, etc.
   - Click "Save"

3. **What Happens:**
   - ✅ A user account is created with the vendor role
   - ✅ The vendor profile is linked to this user account
   - ✅ The vendor can now login with their email and password

### Editing an Existing Vendor

1. Click "Edit" on any vendor
2. Update their information
3. **To change password:**
   - Enter new password in "Password" field
   - Confirm in "Confirm Password" field
4. **To keep current password:**
   - Leave both password fields empty
5. Click "Save"

---

## For Vendors

### What You Can See

When you login as a vendor, you will see:

**✅ Dashboard**
- Your total sales
- Your order statistics
- Your revenue and profit
- Charts with your sales data
- Your recent orders
- Your top products
- Your top clients

**✅ Marketplace**
- Only products assigned to you
- Product details and pricing
- Your product commissions

**✅ Orders**
- Only orders assigned to you
- Order details and tracking
- Customer information
- Order status updates

**✅ API Integrations → Shopify**
- Connect your Shopify store
- Sync your Shopify orders
- Manage webhooks
- View sync history

**✅ Settings**
- App settings (view only)

### What You Cannot See

**❌ Products** - Internal inventory management (admin only)  
**❌ Stock** - Warehouse stock management (admin only)  
**❌ Sellers** - Other vendors (admin only)  
**❌ Expenses** - Company expenses (admin only)  
**❌ User Management** - User and role management (admin only)  
**❌ Tawsilex Integration** - Delivery service (admin only)  
**❌ BMDelivery Integration** - Delivery service (admin only)  

---

## First Login Steps for Vendors

### 1. Login
- Go to the login page
- Enter your email (provided by admin)
- Enter your password (provided by admin)
- Click "Login"

### 2. Explore Your Dashboard
- View your sales statistics
- Check your recent orders
- See your top-selling products

### 3. Check Your Marketplace
- See all products assigned to you
- Review pricing and commissions

### 4. Connect Your Shopify Store (Optional)
- Go to "API Integrations" → "Shopify"
- Click "Connect" or "Configure"
- Enter your Shopify store details:
  - Shop URL (e.g., yourstore.myshopify.com)
  - Admin API Access Token
- Click "Test Connection"
- Click "Save"

### 5. View Your Orders
- Go to "Orders"
- See all orders assigned to you
- Filter by status, date, source
- View order details
- Print order invoices

---

## Common Questions

### Q: Can I see other vendors' data?
**A:** No, you can only see your own orders, products, and statistics.

### Q: Can I connect multiple Shopify stores?
**A:** Currently, each vendor can connect one Shopify store. Contact admin for multi-store support.

### Q: Where are my Shopify orders?
**A:** Once you connect your Shopify store:
- New orders are automatically imported via webhooks
- You can manually sync orders using the "Sync" button
- All orders appear in the "Orders" page

### Q: Can I manage inventory?
**A:** No, inventory (stock) is managed by administrators. You can view your assigned products in the Marketplace.

### Q: Can I add new products?
**A:** No, products are added by administrators. You can request new products through your admin contact.

### Q: Can I see company expenses?
**A:** No, expenses are managed by administrators only.

### Q: Can I create other user accounts?
**A:** No, user management is restricted to administrators.

### Q: How do I change my password?
**A:** Contact your administrator to change your password.

---

## Troubleshooting

### I can't login
- **Check:** Email and password are correct (case-sensitive)
- **Check:** Your account is active (contact admin)
- **Check:** You have the "vendor" role assigned

### I don't see any products in Marketplace
- **Reason:** No products have been assigned to you yet
- **Solution:** Contact admin to assign products to you

### I don't see any orders
- **Reason:** No orders have been assigned to you yet
- **Or:** Orders haven't synced from Shopify yet
- **Solution:** Wait for orders or check Shopify integration

### Shopify connection failed
- **Check:** Shop URL format (must be: yourstore.myshopify.com)
- **Check:** Access token is correct
- **Check:** Token has required permissions
- **Solution:** See Shopify integration documentation

---

## Support

For technical support or questions:
- Contact your system administrator
- Refer to the full documentation: `VENDOR_ROLE_SYSTEM.md`

---

## Summary

As a vendor, you have a **personalized, focused dashboard** that shows only your data:
- ✅ Your sales and statistics
- ✅ Your orders
- ✅ Your products
- ✅ Your Shopify store connection

You **cannot access** admin-only features:
- ❌ Internal inventory
- ❌ Other vendors' data
- ❌ Company expenses
- ❌ User management

This keeps your experience simple and focused on what matters to you!

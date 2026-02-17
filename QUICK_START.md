# Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Database Setup (Already Done ✅)
The database has been migrated and seeded with default data.

### 2. Login to the System

**Super Admin Account:**
```
URL: http://localhost:8000/login
Email: superadmin@ecommerce.com
Password: SuperAdmin@2026
```

### 3. Create Your First User

1. Go to **Users** (sidebar)
2. Click **Add User**
3. Fill in:
   - Name: "Test Manager"
   - Email: "manager@test.com"
   - Password: "password123"
   - Role: Select "Admin"
   - Status: Active
4. Click **Create**

### 4. Create Your First Product

1. Go to **Products** (sidebar)
2. Click **Add Product**
3. Fill in:
   - Product Name: "Sample Product"
   - SKU: "PROD-001"
   - Price: 100
   - Company Price: 90
   - Vendor Price: 80
   - Stock Quantity: 50
   - Min Stock Quantity: 10
4. Upload an image (optional)
5. Check "Active"
6. Click **Create Product**

### 5. Create Your First Order

1. Go to **Orders** (sidebar)
2. Click **Create Order**
3. Select a client (you may need to create one first)
4. Add products:
   - Select your product
   - Set quantity: 2
   - Price auto-fills
5. Assign agents (optional)
6. Set shipping cost: 30
7. Click **Create Order**

## 📋 Common Tasks

### Create a Client
1. Go to **Clients**
2. Click **Add Client**
3. Fill in name, phone, address
4. Click **Create**

### Assign Delivery Agent to Order
1. Go to **Orders**
2. Click **View** on an order
3. Click **Assign Agent**
4. Select agent
5. Click **Assign**

### Update Order Status
1. Go to **Orders**
2. Click **View** on an order
3. Click **Update Status**
4. Select new status
5. Add note (optional)
6. Click **Update**

### Upload Product Images
1. Edit a product
2. Scroll to "Images" section
3. Click "Add New Images"
4. Select multiple images
5. Click **Update Product**

## 🎯 Key Features to Try

### User Management
- ✅ Create users with different roles
- ✅ Filter users by role
- ✅ Search users by name/email
- ✅ Activate/deactivate users

### Product Management
- ✅ Add multiple pricing tiers
- ✅ Upload multiple images
- ✅ Track stock levels
- ✅ Set low stock alerts

### Order Management
- ✅ Create multi-product orders
- ✅ Assign confirmation agent
- ✅ Assign delivery agent
- ✅ Track order status
- ✅ WhatsApp integration

## 📱 Testing WhatsApp Integration

1. Create an order with a client's WhatsApp number
2. Go to **Orders** list
3. Click the WhatsApp number in the order row
4. It will open WhatsApp Web/App with the number

## 🔐 Role Permissions

### What Each Role Can Do:

**Super Admin** - Everything
- Manage all users
- Manage all products
- Manage all orders
- Access all settings

**Admin** - Most things
- Manage products
- Manage orders
- Manage clients/vendors
- View reports

**Agent Confirmation** - Order confirmation
- View orders
- Confirm orders
- View clients
- View products

**Agent Livraison** - Delivery management
- View orders
- Update delivery status
- View clients

**Delivery** - Assigned orders only
- View assigned orders
- Update delivery status

**Vendor** - Own products only
- View own products
- View related orders

## 🎨 UI Navigation

### Sidebar Menu
- **Dashboard** - Overview and statistics
- **Products** - Product catalog
- **Categories** - Product categories
- **Orders** - Order management
- **Clients** - Customer database
- **Vendors** - Supplier management
- **Expenses** - Expense tracking
- **Stock** - Inventory management
- **Users** - User management (Admin only)
- **Settings** - System settings

## 💡 Pro Tips

### For Faster Order Creation:
1. Create clients first with complete info
2. Client address auto-fills in orders
3. WhatsApp auto-fills from client phone

### For Better Product Management:
1. Use descriptive SKUs (e.g., CAT-PROD-001)
2. Set realistic min stock levels
3. Upload multiple product angles
4. Fill all pricing fields for reports

### For Efficient User Management:
1. Use role filters to find specific users
2. Deactivate instead of delete
3. Assign appropriate permissions
4. Regular password updates

## 🔍 Search & Filter Tips

### Users
- Search: Type name or email
- Filter: By role, status
- Sort: By creation date

### Products
- Search: Type name or SKU
- Filter: By category, vendor, status
- Show: Low stock items only

### Orders
- Search: Order number or client
- Filter: By status, date range
- Sort: Latest first

## 📊 Dashboard Overview

The dashboard shows:
- Total orders count
- Pending orders
- Total revenue
- Low stock alerts
- Recent orders
- Top products
- Revenue charts

## 🛠️ Troubleshooting

### Can't see Users menu?
- Only Admin and Super Admin can access
- Check your role permissions

### Images not uploading?
- Max size: 2MB per image
- Formats: JPG, PNG, GIF, WEBP
- Check storage permissions

### Can't create order?
- Ensure client is selected
- Add at least one product
- Check product stock availability

### WhatsApp link not working?
- Ensure number includes country code
- Format: +212 600 000 000
- WhatsApp must be installed

## 📞 Need Help?

1. Check the **User Guide** for detailed instructions
2. Review **API Documentation** for technical details
3. See **Implementation Summary** for feature overview
4. Contact system administrator

## 🎯 Next Steps

After getting familiar with basics:

1. **Customize Settings**
   - Company information
   - Currency settings
   - Default values

2. **Import Data**
   - Bulk import products
   - Import client database
   - Import vendor list

3. **Set Up Workflows**
   - Order confirmation process
   - Delivery assignment rules
   - Status update procedures

4. **Configure Notifications**
   - Low stock alerts
   - Order status updates
   - Delivery notifications

5. **Generate Reports**
   - Sales reports
   - Inventory reports
   - Agent performance

## ✅ Checklist for First Day

- [ ] Login with super admin
- [ ] Create at least 3 users with different roles
- [ ] Create at least 5 products
- [ ] Create at least 3 clients
- [ ] Create at least 2 orders
- [ ] Test order status updates
- [ ] Test agent assignments
- [ ] Upload product images
- [ ] Test search and filters
- [ ] Review dashboard

## 🎓 Training Resources

- **User Guide** - Complete feature documentation
- **API Documentation** - For developers
- **Implementation Summary** - Technical overview
- **Deployment Checklist** - For production setup

---

**Ready to start?** Login now and create your first user! 🚀

**Need help?** Check the User Guide or contact support.

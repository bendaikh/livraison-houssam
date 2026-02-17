# User Guide - E-Commerce Delivery Management System

## Getting Started

### Login Credentials

**Super Admin Account:**
- Email: `superadmin@ecommerce.com`
- Password: `SuperAdmin@2026`

**Test Accounts:**
- Admin: `admin@example.com` / `password`
- Agent Confirmation: `confirmation@example.com` / `password`
- Agent Livraison: `livraison@example.com` / `password`
- Delivery: `delivery@example.com` / `password`
- Vendor: `vendor@example.com` / `password`

## User Management

### Creating a New User

1. Navigate to **Users** from the sidebar
2. Click **Add User** button (top right)
3. Fill in the form:
   - **Name**: Full name of the user
   - **Email**: Valid email address (must be unique)
   - **Password**: Minimum 8 characters
   - **Role**: Select from dropdown:
     - Super Admin
     - Admin
     - Agent Confirmation
     - Agent Livraison
     - Delivery
     - Vendor
   - **Phone**: Optional contact number
   - **Address**: Optional address
   - **Status**: Active/Inactive
4. Click **Create**

### Editing a User

1. Find the user in the list
2. Click **Edit** button
3. Modify the fields (leave password blank to keep current)
4. Click **Update**

### Filtering Users

- **Search**: Type name or email in search box
- **Role Filter**: Select specific role from dropdown
- **Status Filter**: Filter by Active/Inactive

## Product Management

### Creating a Product

1. Navigate to **Products** from the sidebar
2. Click **Add Product** button
3. Fill in the **Basic Information**:
   - **Product Name**: Required
   - **SKU**: Required, must be unique
   - **Description**: Optional detailed description
   - **Category**: Select from dropdown
   - **Vendor**: Select vendor from dropdown

4. Fill in **Pricing**:
   - **Price**: Required, main selling price
   - **Company Price**: Optional
   - **Vendor Price**: Optional
   - **Cost Price**: Optional

5. Fill in **Stock & Weight**:
   - **Stock Quantity**: Required, current stock level
   - **Min Stock Quantity**: Required, alert threshold
   - **Weight**: Optional
   - **Weight Unit**: kg/g/lb

6. Upload **Images**:
   - Click "Add New Images"
   - Select multiple images
   - Preview before saving
   - Can delete images after upload

7. Set **Status**: Check "Active" to make product visible

8. Click **Create Product**

### Editing a Product

1. Find product in the list
2. Click the **Edit** icon
3. Modify fields as needed
4. Click **Update Product**

### Deleting Product Images

When editing a product:
1. Hover over existing image
2. Click the **×** button on the image
3. Confirm deletion

## Order Management

### Creating an Order

1. Navigate to **Orders** from the sidebar
2. Click **Create Order** button

3. **Client Information**:
   - Select client from dropdown
   - WhatsApp number auto-fills from client
   - Address auto-fills from client
   - Can modify both if needed

4. **Order Details**:
   - **Vendor**: Optional, select vendor
   - **Agent Confirmation**: Select confirmation agent
   - **Delivery Agent**: Select delivery agent (Agent Livraison)
   - **Source**: Manual/Shopify/Delivery Company/Marketplace
   - **Notes**: Optional order notes

5. **Add Products**:
   - Click **+ Add Product** to add more lines
   - For each product:
     - Select product from dropdown
     - Enter quantity
     - Price auto-fills (can be modified)
     - Total calculates automatically
   - Click **×** to remove a product line

6. **Pricing**:
   - **Subtotal**: Calculated automatically
   - **Shipping Cost**: Enter shipping charges
   - **Tax**: Enter tax amount
   - **Discount**: Enter discount amount
   - **Total**: Calculated automatically

7. Click **Create Order**

### Viewing Orders

The order list displays:
- **Date**: Order creation date
- **ID**: Unique order number
- **Client Name**: Customer name
- **Phone**: Contact number
- **City**: Client's city
- **Address**: Delivery address
- **Price**: Total order amount
- **Products**: List of products with quantities
- **Status**: Order status badge
- **Livreur**: Assigned delivery agent
- **Agent**: Confirmation agent
- **WhatsApp**: Clickable link to open WhatsApp

### Filtering Orders

- **Search**: Order number or client name/phone
- **Status**: Filter by order status
- **Date Range**: Select from and to dates

### Order Statuses

- **Pending**: New order, not yet confirmed
- **Confirmed**: Order confirmed by agent
- **Shipped**: Order shipped for delivery
- **Delivered**: Successfully delivered
- **Cancelled**: Order cancelled

## Role Descriptions

### Super Admin
- Full system access
- Can manage all users and roles
- Access to all features
- Can delete anything

### Admin
- Full operational access
- Can manage products, orders, clients, vendors
- Can manage users (except super admin)
- Access to all reports

### Agent Confirmation
- Can view and confirm orders
- Access to client information
- Can view products
- Dashboard access

### Agent Livraison
- Can manage deliveries
- Update order delivery status
- View assigned orders
- Dashboard access

### Delivery
- View assigned orders only
- Update delivery status
- Limited access

### Vendor
- View own products
- View orders for own products
- Dashboard access
- Cannot modify system settings

## Tips and Best Practices

### User Management
- Always assign appropriate roles
- Deactivate users instead of deleting when possible
- Use strong passwords for admin accounts
- Regularly review user access

### Product Management
- Use unique, descriptive SKUs
- Keep stock quantities updated
- Set appropriate min stock levels
- Upload high-quality product images
- Fill in all pricing fields for accurate reporting

### Order Management
- Always verify client information
- Assign agents at order creation
- Double-check product quantities
- Add notes for special instructions
- Update order status promptly

### General
- Use search and filters to find information quickly
- Check dashboard regularly for overview
- Keep client information updated
- Monitor low stock alerts

## Troubleshooting

### Cannot Create User
- Check if email already exists
- Ensure password is at least 8 characters
- Verify role is selected

### Cannot Create Product
- Ensure SKU is unique
- Check all required fields are filled
- Verify image file size (max 2MB per image)

### Cannot Create Order
- Ensure client is selected
- Add at least one product
- Check product quantities are valid
- Verify all required fields

### Images Not Uploading
- Check file format (JPG, PNG, GIF, WEBP)
- Ensure file size is under 2MB
- Check storage permissions

## Support

For technical support or questions:
- Contact your system administrator
- Check the Implementation Summary document
- Review error messages for specific issues

## Security Notes

- Never share login credentials
- Log out when finished
- Change default passwords immediately
- Report suspicious activity
- Keep personal information confidential

# 🛒 Advanced eCommerce Web Application

A complete, production-ready eCommerce management system built with **Laravel 12** and **React 18**, featuring clean architecture, scalable structure, and professional coding standards.

---

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Installation](#-installation)
- [Running the Application](#-running-the-application)
- [Login Credentials](#-login-credentials)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)

---

## ✨ Features

### 1️⃣ Dashboard Module
- **Sales Statistics**: Daily, monthly, and yearly analytics
- **Revenue Calculation**: Automatic profit/loss tracking
- **Orders Count**: Real-time order status monitoring
- **Interactive Charts**: Sales and orders evolution graphs (Recharts)
- **API Orders Indicator**: Integration status monitoring
- **Low Stock Alerts**: Real-time inventory warnings
- **Recent Orders List**: Quick overview of latest transactions

### 2️⃣ Product Management
- ✅ Full CRUD operations
- ✅ Categories management (hierarchical structure)
- ✅ Multiple product images upload
- ✅ Price and cost price tracking
- ✅ Product status (active/inactive)
- ✅ Stock quantity tracking
- ✅ SKU support with validation
- ✅ Vendor assignment for marketplace

### 3️⃣ Expense Management
- ✅ Add and track expenses
- ✅ Expense categories
- ✅ Comprehensive expense reports
- ✅ Filter by date range
- ✅ Total expense calculation
- ✅ Receipt upload support

### 4️⃣ Stock Management
- ✅ Stock entry (purchase tracking)
- ✅ Stock exit (sale or manual deduction)
- ✅ Complete stock movement history
- ✅ Minimum stock alert system
- ✅ Automatic stock deduction on order confirmation
- ✅ Stock adjustment with audit trail

### 5️⃣ Order Management
- ✅ Manual order creation
- ✅ API orders (Shopify + delivery companies integration)
- ✅ Order statuses: Pending → Confirmed → Shipped → Delivered → Cancelled
- ✅ Delivery agent assignment
- ✅ Order source tracking (Shopify/Delivery/Marketplace/Manual)
- ✅ Complete order timeline history

### 6️⃣ Client Management
- ✅ Complete client database
- ✅ Client profile pages
- ✅ Orders history per client
- ✅ Total spent tracking
- ✅ Contact information management
- ✅ Client status and notes

### 7️⃣ Marketplace (Multi-Vendor System)
- ✅ Vendors management
- ✅ Vendor activation/deactivation
- ✅ Vendors products listing
- ✅ Commission system (percentage-based)
- ✅ Vendor sales tracking
- ✅ Vendor revenue reports
- ✅ Admin global commission settings

### 8️⃣ API Integrations
- ✅ Shopify integration (orders sync)
- ✅ Two delivery companies integration
- ✅ Automatic synchronization
- ✅ API keys management panel
- ✅ Detailed import logs
- ✅ Failed import logs for debugging
- ✅ Manual sync button

### 9️⃣ User Management
**Roles:**
- 👤 **Admin**: Full system access
- 👤 **Confirmation Agent**: Order confirmation access
- 👤 **Delivery Agent**: Delivery management access

**Features:**
- ✅ Complete roles & permissions system
- ✅ Access control middleware
- ✅ Assign orders to delivery agents

### 🔟 Settings
- ✅ Company information
- ✅ Currency: MAD (Moroccan Dirham)
- ✅ Delivery settings
- ✅ Commission settings
- ✅ Notification settings
- ✅ System configuration

### 🎨 UI Features
- ✅ Modern responsive admin dashboard
- ✅ Sidebar navigation with all modules
- ✅ Professional clean layout
- ✅ Real-time notification system
- ✅ Alert badges (stock alerts, new orders)
- ✅ Mobile-responsive design

---

## 🛠️ Technology Stack

### Backend
- **Framework**: Laravel 12
- **Database**: SQLite (easily switchable to MySQL/PostgreSQL)
- **Authentication**: Laravel Sanctum (Token-based)
- **Architecture**: Clean Architecture with Service Layer

### Frontend
- **Framework**: React 18
- **Routing**: React Router DOM v6
- **Charts**: Recharts
- **Icons**: Lucide React
- **Styling**: Tailwind CSS 4
- **Build Tool**: Vite 7

### Development Tools
- **Package Manager**: Composer (PHP), npm (JavaScript)
- **Code Quality**: Laravel Pint (PHP), ESLint (JavaScript)

---

## 🚀 Installation

### Prerequisites
- PHP 8.2 or higher
- Composer
- Node.js 18+ and npm
- SQLite extension enabled

### Step-by-Step Installation

```bash
# 1. Navigate to project directory
cd livraison-houssam

# 2. Install PHP dependencies
composer install

# 3. Install JavaScript dependencies
npm install

# 4. Setup environment file (already configured)
# The .env file is already set up with SQLite

# 5. Generate application key
php artisan key:generate

# 6. Run database migrations
php artisan migrate

# 7. Seed database with demo data
php artisan db:seed

# 8. Build frontend assets
npm run build
```

---

## 🎯 Running the Application

### Development Mode (Recommended)

**Option 1: Run both services with one command**
```bash
composer dev
```
This will run:
- Laravel development server (port 8000)
- Vite dev server (HMR enabled)
- Queue worker
- Log viewer (Pail)

**Option 2: Run services separately**

Terminal 1 - Backend:
```bash
php artisan serve
```

Terminal 2 - Frontend:
```bash
npm run dev
```

### Production Mode
```bash
npm run build
php artisan serve
```

**Access the application:**
- URL: http://localhost:8000
- API: http://localhost:8000/api

---

## 👤 Login Credentials

After running `php artisan db:seed`, use these credentials:

### Admin Account (Full Access)
- **Email**: admin@example.com
- **Password**: password
- **Access**: All modules and features

### Confirmation Agent Account
- **Email**: confirmation@example.com
- **Password**: password
- **Access**: View and confirm orders

### Delivery Agent Account
- **Email**: delivery@example.com
- **Password**: password
- **Access**: Manage deliveries

---

## 📁 Project Structure

```
livraison-houssam/
├── app/
│   ├── Http/
│   │   ├── Controllers/          # 15 API Controllers
│   │   │   ├── DashboardController.php
│   │   │   ├── ProductController.php
│   │   │   ├── OrderController.php
│   │   │   ├── ClientController.php
│   │   │   ├── VendorController.php
│   │   │   ├── ExpenseController.php
│   │   │   ├── StockController.php
│   │   │   ├── ApiIntegrationController.php
│   │   │   └── ... (and more)
│   │   └── Middleware/           # Custom Middleware
│   │       ├── CheckRole.php
│   │       └── CheckPermission.php
│   ├── Models/                   # 15 Eloquent Models
│   │   ├── User.php, Role.php
│   │   ├── Product.php, Category.php
│   │   ├── Order.php, OrderItem.php
│   │   ├── Client.php, Vendor.php
│   │   └── ... (and more)
│   └── Services/                 # Business Logic Services
│       ├── DashboardService.php
│       ├── StockService.php
│       ├── OrderService.php
│       └── ApiIntegrationService.php
├── database/
│   ├── migrations/               # 16 Database Migrations
│   └── seeders/                  # Database Seeders
│       └── DatabaseSeeder.php
├── resources/
│   ├── js/                       # React Frontend
│   │   ├── App.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── layouts/
│   │   │   ├── MainLayout.jsx
│   │   │   └── AuthLayout.jsx
│   │   ├── pages/                # 17+ Page Components
│   │   │   ├── Dashboard/
│   │   │   ├── Products/
│   │   │   ├── Orders/
│   │   │   ├── Clients/
│   │   │   ├── Vendors/
│   │   │   ├── Expenses/
│   │   │   ├── Stock/
│   │   │   └── ... (and more)
│   │   └── utils/
│   │       └── api.js
│   ├── css/
│   │   └── app.css
│   └── views/
│       └── app.blade.php
├── routes/
│   ├── api.php                   # API Routes (50+ endpoints)
│   ├── web.php                   # Web Routes
│   └── console.php
└── public/                       # Public Assets
```

---

## 🔐 API Documentation

### Authentication Endpoints

```http
POST   /api/login              # User login
POST   /api/logout             # User logout (requires auth)
GET    /api/me                 # Get current user (requires auth)
```

### Dashboard Endpoints

```http
GET    /api/dashboard?period={daily|monthly|yearly}
```

### Product Management

```http
GET    /api/products           # List all products (with filters)
POST   /api/products           # Create product
GET    /api/products/{id}      # Get product details
PUT    /api/products/{id}      # Update product
DELETE /api/products/{id}      # Delete product
DELETE /api/products/{id}/images # Delete product image
```

### Order Management

```http
GET    /api/orders             # List all orders (with filters)
POST   /api/orders             # Create order
GET    /api/orders/{id}        # Get order details
PATCH  /api/orders/{id}/status # Update order status
PATCH  /api/orders/{id}/assign-agent # Assign delivery agent
DELETE /api/orders/{id}        # Delete order
```

### Stock Management

```http
POST   /api/stock/add          # Add stock
POST   /api/stock/remove       # Remove stock
POST   /api/stock/adjust       # Adjust stock
GET    /api/stock/history      # Get stock movements
GET    /api/stock/low-stock    # Get low stock products
```

### Client Management

```http
GET    /api/clients            # List all clients
POST   /api/clients            # Create client
GET    /api/clients/{id}       # Get client details
PUT    /api/clients/{id}       # Update client
DELETE /api/clients/{id}       # Delete client
```

### Vendor Management

```http
GET    /api/vendors            # List all vendors
POST   /api/vendors            # Create vendor
GET    /api/vendors/{id}       # Get vendor details
PUT    /api/vendors/{id}       # Update vendor
DELETE /api/vendors/{id}       # Delete vendor
GET    /api/vendors/{id}/sales-report # Get vendor sales report
```

### Expense Management

```http
GET    /api/expenses           # List all expenses
POST   /api/expenses           # Create expense
GET    /api/expenses/{id}      # Get expense details
PUT    /api/expenses/{id}      # Update expense
DELETE /api/expenses/{id}      # Delete expense
GET    /api/expenses-report    # Get expense report
```

### API Integrations

```http
GET    /api/api-integrations   # List all integrations
POST   /api/api-integrations   # Create integration
GET    /api/api-integrations/{id} # Get integration details
PUT    /api/api-integrations/{id} # Update integration
DELETE /api/api-integrations/{id} # Delete integration
POST   /api/api-integrations/{id}/sync # Sync orders
GET    /api/api-integrations/{id}/logs # Get sync logs
```

### User & Role Management (Admin Only)

```http
GET    /api/users              # List all users
POST   /api/users              # Create user
GET    /api/users/{id}         # Get user details
PUT    /api/users/{id}         # Update user
DELETE /api/users/{id}         # Delete user
GET    /api/delivery-agents    # Get delivery agents

GET    /api/roles              # List all roles
POST   /api/roles              # Create role
```

### Settings

```http
GET    /api/settings?group={group} # Get settings by group
PUT    /api/settings           # Update settings
GET    /api/settings/{key}     # Get specific setting
```

### Notifications

```http
GET    /api/notifications      # List user notifications
GET    /api/notifications/unread-count # Get unread count
PATCH  /api/notifications/{id}/read # Mark as read
POST   /api/notifications/mark-all-read # Mark all as read
DELETE /api/notifications/{id} # Delete notification
```

---

## 🗄️ Database Schema

### Main Tables (16 Total)

1. **users** - System users
2. **roles** - User roles
3. **categories** - Product categories (hierarchical)
4. **vendors** - Marketplace vendors
5. **products** - Product catalog
6. **clients** - Customer database
7. **orders** - Order records
8. **order_items** - Order line items
9. **order_history** - Order timeline
10. **expense_categories** - Expense categories
11. **expenses** - Business expenses
12. **stock_movements** - Stock tracking
13. **api_integrations** - API configurations
14. **api_import_logs** - Import logs
15. **settings** - System settings
16. **notifications** - User notifications

---

## 🔧 Common Commands

```bash
# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# Reset database
php artisan migrate:fresh --seed

# Rebuild frontend
npm run build

# Run tests
php artisan test

# Check routes
php artisan route:list

# Check models
php artisan model:show Product
```

---

## 🐛 Troubleshooting

### Port 8000 Already in Use
```bash
php artisan serve --port=8001
```

### Database Issues
```bash
# Reset and reseed database
php artisan migrate:fresh --seed
```

### Asset Build Issues
```bash
# Clear cache and rebuild
npm run build
php artisan config:clear
php artisan cache:clear
```

### Permission Issues (Linux/Mac)
```bash
chmod -R 775 storage bootstrap/cache
```

---

## 📊 Key Features Highlights

✅ **Clean Architecture** - Service layer pattern, repository pattern
✅ **RESTful API** - 50+ well-structured endpoints
✅ **Authentication** - Laravel Sanctum token-based auth
✅ **Authorization** - Role-based access control (RBAC)
✅ **Real-time Features** - Notifications, stock alerts
✅ **Responsive Design** - Mobile-friendly interface
✅ **Interactive UI** - Charts, graphs, data tables
✅ **Multi-vendor** - Complete marketplace functionality
✅ **API Integrations** - Shopify, delivery companies
✅ **Comprehensive Reporting** - Sales, expenses, commissions

---

## 📝 License

This project is proprietary software.

---

## 👨‍💻 Developer

Built by a **Senior Full-Stack Software Architect** with:
- Clean, scalable architecture
- Professional coding standards
- Production-ready implementation
- Complete documentation

---

## 🎯 Next Steps

1. ✅ Login with admin credentials
2. ✅ Explore the dashboard
3. ✅ Add your products and categories
4. ✅ Configure API integrations
5. ✅ Create your first order
6. ✅ Manage stock and inventory
7. ✅ Generate reports
8. ✅ Configure system settings

---

## 🤝 Support

For technical support or questions, please contact the development team.

---

**Status**: ✅ Production Ready | **Version**: 1.0.0 | **Built with**: Laravel 12 + React 18

# E-Commerce Delivery Management System

A comprehensive Laravel + React application for managing e-commerce orders, products, users, and deliveries with role-based access control.

## Features

### 🎯 Core Functionality
- **User Management**: Create and manage users with role-based permissions
- **Product Management**: Full product catalog with multiple pricing tiers and image support
- **Order Management**: Complete order workflow from creation to delivery
- **Role-Based Access Control**: 6 different roles with granular permissions
- **Multi-Agent System**: Separate agents for confirmation and delivery
- **WhatsApp Integration**: Direct WhatsApp links for customer communication

### 👥 User Roles
1. **Super Admin** - Full system access
2. **Admin** - Operational management
3. **Agent Confirmation** - Order confirmation
4. **Agent Livraison** - Delivery management
5. **Delivery** - Delivery personnel
6. **Vendor** - Supplier access

### 📦 Product Features
- Multiple pricing fields (Price, Company Price, Vendor Price)
- Stock management with low-stock alerts
- Multiple image upload
- Category and vendor assignment
- SKU tracking

### 📋 Order Features
- Multi-product orders
- Agent assignment (Confirmation & Delivery)
- Automatic price calculations
- Order status tracking
- WhatsApp integration
- Comprehensive filtering and search

## Technology Stack

### Backend
- **Laravel 11** - PHP Framework
- **MySQL** - Database
- **Laravel Sanctum** - API Authentication
- **Laravel Migrations** - Database versioning

### Frontend
- **React 18** - UI Framework
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Axios** - HTTP client

## Installation

### Prerequisites
- PHP 8.2 or higher
- Composer
- Node.js 18+ and npm
- MySQL 8.0+

### Setup Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd livraison-houssam
```

2. **Install PHP dependencies**
```bash
composer install
```

3. **Install Node dependencies**
```bash
npm install
```

4. **Environment configuration**
```bash
cp .env.example .env
php artisan key:generate
```

5. **Configure database in `.env`**
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

6. **Run migrations and seeders**
```bash
php artisan migrate --seed
```

7. **Create storage link**
```bash
php artisan storage:link
```

8. **Build frontend assets**
```bash
npm run build
```

9. **Start development server**
```bash
# Terminal 1 - Laravel
php artisan serve

# Terminal 2 - Vite (for development)
npm run dev
```

## Default Login Credentials

### Super Admin
- **Email**: superadmin@ecommerce.com
- **Password**: SuperAdmin@2026

### Test Accounts
- **Admin**: admin@example.com / password
- **Agent Confirmation**: confirmation@example.com / password
- **Agent Livraison**: livraison@example.com / password
- **Delivery**: delivery@example.com / password
- **Vendor**: vendor@example.com / password

## Project Structure

```
livraison-houssam/
├── app/
│   ├── Http/
│   │   ├── Controllers/    # API Controllers
│   │   └── Middleware/     # Custom middleware
│   ├── Models/            # Eloquent models
│   └── Services/          # Business logic
├── database/
│   ├── migrations/        # Database migrations
│   └── seeders/          # Database seeders
├── resources/
│   ├── js/
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts
│   │   ├── layouts/      # Layout components
│   │   ├── pages/        # Page components
│   │   └── utils/        # Utility functions
│   └── views/            # Blade templates
├── routes/
│   ├── api.php           # API routes
│   └── web.php           # Web routes
└── public/               # Public assets
```

## Documentation

- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Complete feature overview
- **[User Guide](USER_GUIDE.md)** - End-user documentation
- **[API Documentation](API_DOCUMENTATION.md)** - API endpoints reference
- **[Deployment Checklist](DEPLOYMENT_CHECKLIST.md)** - Production deployment guide

## Key Features by Module

### User Management (`/users`)
- Create users with role assignment
- Edit user details and permissions
- Filter by role and status
- Search by name or email
- Activate/deactivate users

### Product Management (`/products`)
- Create products with multiple pricing tiers
- Upload and manage product images
- Set stock levels and alerts
- Assign categories and vendors
- Track SKUs

### Order Management (`/orders`)
- Create orders with multiple products
- Assign confirmation and delivery agents
- Calculate totals automatically
- Track order status
- WhatsApp integration
- Comprehensive filtering

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/me` - Get current user

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `PATCH /api/orders/{id}/status` - Update status
- `PATCH /api/orders/{id}/assign-agent` - Assign agent

See [API Documentation](API_DOCUMENTATION.md) for complete API reference.

## Development

### Run in development mode
```bash
# Backend
php artisan serve

# Frontend (with hot reload)
npm run dev
```

### Build for production
```bash
npm run build
php artisan optimize
```

### Run tests
```bash
php artisan test
```

### Clear caches
```bash
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

## Security

- Laravel Sanctum for API authentication
- Role-based access control (RBAC)
- CSRF protection
- SQL injection prevention via Eloquent ORM
- XSS protection
- Password hashing with bcrypt

## Performance Optimization

- Route caching
- Config caching
- View caching
- Database query optimization
- Image optimization
- Asset minification

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## Troubleshooting

### Images not uploading
- Check storage permissions
- Verify `php.ini` upload limits
- Ensure storage link exists

### Database connection error
- Verify `.env` database credentials
- Check MySQL service is running
- Confirm database exists

### Frontend not loading
- Run `npm run build`
- Clear browser cache
- Check console for errors

## License

This project is proprietary software.

## Support

For support, please contact the development team or refer to the documentation files.

## Changelog

### Version 1.0.0 (Current)
- Initial release
- User management with 6 roles
- Product management with multiple pricing
- Order management with agent assignment
- WhatsApp integration
- Complete CRUD operations
- Role-based permissions
- Image upload support
- Comprehensive filtering and search

## Roadmap

- [ ] Email notifications
- [ ] SMS integration
- [ ] Advanced reporting
- [ ] Export functionality
- [ ] Mobile app
- [ ] Real-time updates
- [ ] Inventory forecasting
- [ ] Multi-language support

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Maintained By**: Development Team

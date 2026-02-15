# Quick Start Guide

Get your Advanced eCommerce Application up and running in 5 minutes!

---

## 🚀 Quick Setup (Windows)

### Step 1: Open Terminal
Open PowerShell in the project directory.

### Step 2: Install Dependencies
```powershell
composer install
npm install
```

### Step 3: Setup Database
```powershell
php artisan migrate
php artisan db:seed
```

### Step 4: Build Frontend
```powershell
npm run build
```

### Step 5: Start Application
```powershell
# Option 1: Quick start (all services)
composer dev

# Option 2: Separate terminals
# Terminal 1:
php artisan serve

# Terminal 2:
npm run dev
```

### Step 6: Login
Open browser: http://localhost:8000

**Admin Login:**
- Email: `admin@example.com`
- Password: `password`

---

## 🎯 What You Get

✅ Complete eCommerce management system
✅ 10 modules fully functional
✅ Modern React admin dashboard
✅ 50+ API endpoints
✅ Demo data pre-loaded
✅ Production-ready architecture

---

## 📚 Next Steps

1. **Explore Dashboard** - View sales statistics and charts
2. **Add Products** - Navigate to Products → Add Product
3. **Create Order** - Go to Orders → New Order
4. **Check Stock** - Visit Stock Management
5. **Configure Settings** - Update company information

---

## 🆘 Troubleshooting

**Port 8000 in use?**
```powershell
php artisan serve --port=8001
```

**Need to reset?**
```powershell
php artisan migrate:fresh --seed
```

**Assets not loading?**
```powershell
npm run build
php artisan config:clear
```

---

## 📖 Full Documentation

- **README.md** - Complete project documentation
- **API_DOCUMENTATION.md** - API reference
- **DEPLOYMENT.md** - Production deployment guide
- **CHANGELOG.md** - Version history

---

## 🎉 You're Ready!

Your Advanced eCommerce Application is now running.

**Happy coding!** 🚀

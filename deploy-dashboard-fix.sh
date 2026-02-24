#!/bin/bash

echo "🚀 Deploying Dashboard Fix to Production..."
echo ""

# Add and commit changes
echo "📝 Committing changes..."
git add app/Services/DashboardService.php
git commit -m "Fix: Dashboard auto-expands date range when no recent orders found

- Dashboard now automatically shows all orders if no data in selected period
- Prevents empty dashboard in production
- Smart date range expansion"

# Push to remote
echo "⬆️  Pushing to remote..."
git push origin main

echo ""
echo "✅ Code pushed successfully!"
echo ""
echo "📋 Next steps on your production server:"
echo "   1. git pull origin main"
echo "   2. php artisan cache:clear"
echo "   3. php artisan config:clear"
echo "   4. php artisan route:clear"
echo "   5. Refresh dashboard in browser"
echo ""
echo "🎉 Dashboard should now show data!"

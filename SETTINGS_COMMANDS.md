# Settings System - Quick Commands Reference

## Database Commands

### Run the Settings Seeder
```bash
php artisan db:seed --class=SettingSeeder
```

### Check Settings in Database
```bash
# Count settings
php artisan tinker --execute="echo count(App\Models\Setting::all()) . ' settings';"

# View all settings
php artisan tinker --execute="App\Models\Setting::all()->pluck('value', 'key');"

# Get specific setting
php artisan tinker --execute="echo App\Models\Setting::get('app_name');"

# Set a setting via command line
php artisan tinker --execute="App\Models\Setting::set('app_name', 'My App');"
```

### Reset Settings to Defaults
```bash
php artisan db:seed --class=SettingSeeder
```

## Frontend Commands

### Development
```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Watch for changes (development)
npm run watch
```

### Check for Errors
```bash
# Check JavaScript/JSX syntax
npm run lint

# Type checking (if using TypeScript)
npm run type-check
```

## Laravel Commands

### Clear Caches
```bash
# Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Or clear everything at once
php artisan optimize:clear
```

### Generate Assets
```bash
# Compile assets
npm run build

# Deploy assets
php artisan view:cache
php artisan route:cache
php artisan config:cache
```

## Testing Commands

### Backend Testing
```bash
# Test setting retrieval
curl http://localhost/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test setting update
curl -X PUT http://localhost/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"settings": {"app_name": "Test"}}'
```

### Frontend Testing
```bash
# Open in browser
start http://localhost/settings  # Windows
open http://localhost/settings   # macOS
xdg-open http://localhost/settings  # Linux
```

## Quick Verification

### Check if Settings System is Working
```bash
# 1. Check database
php artisan tinker --execute="echo count(App\Models\Setting::all());"
# Should output: 36

# 2. Check routes
php artisan route:list | grep settings
# Should show: api/settings endpoints

# 3. Check files exist
ls resources/js/contexts/SettingsContext.jsx
ls resources/js/pages/Settings/Settings.jsx
ls database/seeders/SettingSeeder.php

# 4. Check build
ls public/build/manifest.json
# Should exist after npm run build
```

## Common Tasks

### Change App Name
```bash
php artisan tinker --execute="App\Models\Setting::set('app_name', 'Your App Name');"
```

### Change Currency
```bash
php artisan tinker --execute="
  App\Models\Setting::set('currency_code', 'USD');
  App\Models\Setting::set('currency_symbol', '$');
  App\Models\Setting::set('currency_position', 'before');
"
```

### Disable Notifications
```bash
php artisan tinker --execute="App\Models\Setting::set('notifications_enabled', false, 'boolean');"
```

### Enable Commission
```bash
php artisan tinker --execute="
  App\Models\Setting::set('commission_enabled', true, 'boolean');
  App\Models\Setting::set('commission_type', 'percentage');
  App\Models\Setting::set('commission_value', 15);
"
```

## Troubleshooting Commands

### Settings Not Loading
```bash
# Clear cache
php artisan cache:clear

# Check database connection
php artisan tinker --execute="DB::connection()->getPdo();"

# Rebuild frontend
npm run build
```

### Settings Not Saving
```bash
# Check logs
tail -f storage/logs/laravel.log

# Check permissions
ls -la storage/
ls -la bootstrap/cache/

# Clear config cache
php artisan config:clear
```

### Frontend Errors
```bash
# Check for JavaScript errors
npm run build 2>&1 | grep error

# Clear node modules and reinstall
rm -rf node_modules
npm install
npm run build
```

## Deployment Commands

### Production Deployment
```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
composer install --no-dev --optimize-autoloader
npm ci --production

# 3. Run migrations
php artisan migrate --force

# 4. Run seeder (first time only)
php artisan db:seed --class=SettingSeeder

# 5. Build assets
npm run build

# 6. Optimize Laravel
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 7. Restart services
sudo systemctl restart php-fpm  # or php8.x-fpm
sudo systemctl restart nginx    # or apache2
```

### Rollback Settings
```bash
# If you need to rollback the settings
php artisan migrate:rollback --step=1

# Then re-migrate
php artisan migrate
php artisan db:seed --class=SettingSeeder
```

## Development Workflow

### Making Changes to Settings Page
```bash
# 1. Edit the file
code resources/js/pages/Settings/Settings.jsx

# 2. Watch for changes (in another terminal)
npm run dev

# 3. Refresh browser to see changes
# Hot reload should work automatically
```

### Adding New Settings
```bash
# 1. Add to seeder
code database/seeders/SettingSeeder.php

# 2. Run seeder
php artisan db:seed --class=SettingSeeder

# 3. Add to context defaults
code resources/js/contexts/SettingsContext.jsx

# 4. Add to settings page UI
code resources/js/pages/Settings/Settings.jsx

# 5. Rebuild frontend
npm run build
```

## Backup and Restore

### Backup Settings
```bash
# Export settings to JSON
php artisan tinker --execute="
  file_put_contents('settings_backup.json', 
    json_encode(App\Models\Setting::all()->toArray(), JSON_PRETTY_PRINT)
  );
"
```

### Restore Settings
```bash
# Import settings from JSON (create this command if needed)
php artisan tinker --execute="
  \$settings = json_decode(file_get_contents('settings_backup.json'), true);
  foreach (\$settings as \$setting) {
    App\Models\Setting::updateOrCreate(
      ['key' => \$setting['key']],
      \$setting
    );
  }
"
```

## Performance Monitoring

### Check Frontend Build Size
```bash
npm run build
ls -lh public/build/assets/
```

### Check API Response Time
```bash
time curl http://localhost/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Monitor Database Queries
```bash
# Enable query logging in .env
DB_LOG=true

# Watch queries
tail -f storage/logs/laravel.log | grep "select"
```

## Useful Aliases (Optional)

Add to your `.bashrc` or `.zshrc`:

```bash
# Laravel aliases
alias pa='php artisan'
alias pas='php artisan serve'
alias pat='php artisan tinker'
alias pac='php artisan cache:clear'

# NPM aliases
alias nr='npm run'
alias nrd='npm run dev'
alias nrb='npm run build'

# Settings specific
alias settings-seed='php artisan db:seed --class=SettingSeeder'
alias settings-check='php artisan tinker --execute="echo count(App\Models\Setting::all());"'
```

## Quick Reference Card

```
┌─────────────────────────────────────────────────┐
│  SETTINGS SYSTEM QUICK REFERENCE                │
├─────────────────────────────────────────────────┤
│  Seed Settings:                                 │
│    php artisan db:seed --class=SettingSeeder    │
│                                                  │
│  Build Frontend:                                │
│    npm run build                                │
│                                                  │
│  Check Settings Count:                          │
│    php artisan tinker --execute="               │
│      echo count(App\Models\Setting::all());"    │
│                                                  │
│  Access Settings Page:                          │
│    http://localhost/settings                    │
│                                                  │
│  Clear All Caches:                              │
│    php artisan optimize:clear                   │
└─────────────────────────────────────────────────┘
```

## Documentation Links

- Full Documentation: `SETTINGS_DOCUMENTATION.md`
- Quick Start Guide: `SETTINGS_QUICK_START.md`
- Implementation Summary: `SETTINGS_IMPLEMENTATION_SUMMARY.md`
- Visual Guide: `SETTINGS_VISUAL_GUIDE.md`
- Checklist: `SETTINGS_CHECKLIST.md`

---

**Need Help?**
- Check the logs: `storage/logs/laravel.log`
- Check browser console: F12 > Console
- Review documentation files listed above

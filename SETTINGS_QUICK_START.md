# Settings System - Quick Start Guide

## For End Users

### Accessing Settings

1. Log in to your admin panel
2. Click on **Settings** in the sidebar (gear icon)
3. You'll see 6 tabs for different setting categories

### Updating Settings

#### General Settings
- **Application Name**: Change the name shown in the sidebar and browser title
- **Application Description**: Update the subtitle under the app name
- **Timezone**: Select your timezone (affects date/time displays)
- **Language**: Choose interface language (coming soon)

#### Currency Settings
- **Currency Code**: Enter ISO code (MAD, USD, EUR, etc.)
- **Currency Symbol**: The symbol displayed with amounts (DH, $, €, etc.)
- **Currency Position**: Before ($100) or After (100 DH)
- **Decimal Places**: How many decimal places (0-4)
- **Separators**: Choose decimal and thousand separators
- **Preview**: See a live preview of how amounts will look

#### Company Information
- Fill in your company details
- These appear on invoices and documents
- All fields are optional except company name

#### Order Settings
- **Order Prefix**: Customize order number format (ORD-001, INV-001, etc.)
- **Auto-confirm**: Toggle automatic order confirmation
- **Low Stock Warning**: Enable alerts when products run low
- **Threshold**: Set minimum stock level for alerts

#### Notifications
- **Master Switch**: Enable/disable all notifications
- **Email**: Toggle email notifications
- **SMS**: Toggle SMS notifications (requires setup)
- **Events**: Choose which events trigger notifications

#### Commission
- **Enable Commission**: Turn commission tracking on/off
- **Type**: Percentage or fixed amount
- **Value**: Set the commission rate/amount
- **Preview**: See example calculations

### Saving Changes

1. Make your changes in any tab
2. Click the **Save Changes** button (top right)
3. Wait for the success message
4. Changes apply immediately across the app

### Tips

- Changes to app name and currency are reflected instantly
- Preview features show exactly how settings will look
- You can save at any time - no need to fill all tabs
- Settings are saved per installation, not per user

---

## For Developers

### Quick Integration

```jsx
import { useSettings } from '../contexts/SettingsContext';

function MyComponent() {
    const { settings, formatCurrency } = useSettings();
    
    return (
        <div>
            <h1>{settings.app_name}</h1>
            <p>Price: {formatCurrency(1234.56)}</p>
        </div>
    );
}
```

### Available Hooks

```jsx
const { 
    settings,           // Current settings object
    loading,            // Loading state
    formatCurrency,     // Format number as currency
    refreshSettings,    // Reload settings from API
    updateSettings      // Update settings
} = useSettings();
```

### Backend Usage

```php
// Get a setting
$appName = Setting::get('app_name', 'Default Name');

// Set a setting
Setting::set('app_name', 'My App', 'string', 'general');

// In controllers
$currencySymbol = Setting::get('currency_symbol', 'DH');
```

### Adding New Settings

1. Add to the seeder (`SettingSeeder.php`)
2. Add to context default state (`SettingsContext.jsx`)
3. Add UI in Settings page (`Settings.jsx`)
4. Optionally add to currency utility if needed

### API Endpoints

```bash
# Get all settings
GET /api/settings

# Get by group
GET /api/settings?group=currency

# Update settings
PUT /api/settings
{
    "settings": {
        "app_name": "New Name",
        "currency_symbol": "$"
    }
}
```

### Testing Settings

```bash
# Run seeder
php artisan db:seed --class=SettingSeeder

# Check settings in database
php artisan tinker
>>> Setting::all();
>>> Setting::get('app_name');
```

---

## Common Use Cases

### Change Application Branding

1. Go to Settings > General
2. Update "Application Name" to your company name
3. Update "Application Description" to your tagline
4. Save changes
5. Your brand now appears in sidebar and browser title

### Configure Currency for Your Region

1. Go to Settings > Currency
2. Choose your currency code (e.g., USD for US Dollar)
3. Set the symbol ($, €, £, etc.)
4. Choose position (before/after amount)
5. Set decimal places (usually 2)
6. Configure separators based on your locale
7. Check the preview to ensure it looks correct
8. Save changes

### Enable Email Notifications

1. Go to Settings > Notifications
2. Enable "Enable notifications" (master switch)
3. Enable "Email notifications"
4. Select which events should trigger emails:
   - New order notifications
   - Low stock alerts
5. Save changes

### Set Up Commission Tracking

1. Go to Settings > Commission
2. Enable "Enable commission system"
3. Choose "Percentage" or "Fixed Amount"
4. Enter your commission rate (e.g., 10 for 10%)
5. Check the preview for example calculations
6. Save changes

---

## Troubleshooting

### Settings Not Saving

- Check your internet connection
- Ensure you're logged in
- Look for error messages
- Try refreshing the page

### Changes Not Appearing

- Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
- Clear browser cache
- Log out and log back in

### Currency Format Issues

- Verify decimal separator is different from thousand separator
- Check decimal places setting (0-4)
- Ensure currency symbol doesn't conflict
- Review the live preview before saving

### Contact Support

If you encounter issues:
1. Note which settings you changed
2. Check browser console for errors (F12)
3. Contact your system administrator
4. Provide screenshots if possible

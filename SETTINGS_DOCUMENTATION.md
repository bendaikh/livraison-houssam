# Settings Management System

This document describes the comprehensive settings management system implemented in the Livraison application.

## Overview

The settings system allows you to configure various aspects of the application including:

- **General Settings**: Application name, description, timezone, and language
- **Currency Settings**: Currency code, symbol, formatting, and decimal separators
- **Company Information**: Company details, contact information, and registration numbers
- **Order Settings**: Order prefix, auto-confirmation, and stock warnings
- **Notifications**: Email, SMS, and event-based notifications
- **Commission**: Commission calculation and rates

## Features

### 1. General Settings

Configure basic application settings:

- **Application Name**: The name displayed in the sidebar and browser title
- **Application Description**: Subtitle shown under the app name
- **Timezone**: Application timezone (default: Africa/Casablanca)
- **Language**: Interface language (English, French, Arabic)

### 2. Currency Settings

Complete currency formatting control:

- **Currency Code**: ISO 4217 code (e.g., MAD, USD, EUR)
- **Currency Symbol**: Symbol displayed with amounts (e.g., DH, $, €)
- **Currency Position**: Before or after the amount
- **Decimal Places**: Number of decimal places (0-4)
- **Decimal Separator**: Character used for decimals (., ,)
- **Thousand Separator**: Character used for thousands (,, ., space)
- **Live Preview**: See how currency formatting will look

### 3. Company Information

Manage company details:

- Company Name
- Email Address
- Phone Number
- Physical Address
- Tax Number
- Registration Number

### 4. Order Settings

Configure order management:

- **Order Prefix**: Prefix for order numbers (e.g., ORD-001)
- **Auto-confirm Orders**: Automatically confirm new orders
- **Low Stock Warning**: Enable/disable low stock alerts
- **Low Stock Threshold**: Alert when stock falls below this number

### 5. Notification Preferences

Control notification delivery:

- **Master Switch**: Enable/disable all notifications
- **Email Notifications**: Receive notifications via email
- **SMS Notifications**: Receive notifications via SMS
- **Event Notifications**:
  - New order notifications
  - Low stock alerts

### 6. Commission Settings

Configure commission system:

- **Enable Commission**: Toggle commission tracking
- **Commission Type**: Percentage or fixed amount
- **Commission Value**: Rate or amount
- **Live Preview**: See commission calculation examples

## Backend Structure

### Database

**Table**: `settings`

```php
- id (bigint, primary key)
- key (string, unique)
- value (text, nullable)
- type (string) // string, json, boolean, number
- group (string) // general, currency, company, order, notification, commission
- timestamps
```

### Model: `App\Models\Setting`

**Helper Methods**:

```php
// Get a setting value
Setting::get('app_name', 'Default Name');

// Set a setting value
Setting::set('app_name', 'My App', 'string', 'general');
```

### Controller: `App\Http\Controllers\SettingController`

**API Endpoints**:

```
GET    /api/settings           - Get all settings
GET    /api/settings/{key}     - Get a specific setting
PUT    /api/settings           - Update multiple settings
GET    /api/settings?group=currency - Get settings by group
```

### Seeder: `Database\Seeders\SettingSeeder`

Run the seeder to populate default settings:

```bash
php artisan db:seed --class=SettingSeeder
```

## Frontend Structure

### Context: `SettingsContext`

Global settings context provider with:

- `settings` - Current settings object
- `loading` - Loading state
- `formatCurrency(amount)` - Format amounts with configured currency
- `refreshSettings()` - Refresh settings from API
- `updateSettings(newSettings)` - Update settings

### Usage in Components

```jsx
import { useSettings } from '../contexts/SettingsContext';

function MyComponent() {
    const { settings, formatCurrency } = useSettings();
    
    return (
        <div>
            <h1>{settings.app_name}</h1>
            <p>{formatCurrency(1234.56)}</p>
        </div>
    );
}
```

### Settings Page

Located at `/settings`, provides a beautiful tabbed interface with:

- Tab-based navigation
- Form validation
- Live previews for currency and commission
- Success/error messages
- Auto-save functionality

### MainLayout Integration

The application name and description are dynamically loaded from settings and displayed in:

- Sidebar logo/title
- Footer copyright
- Browser title (via SettingsContext)

## API Usage

### Get All Settings

```javascript
GET /api/settings
Response: {
    "app_name": "Livraison",
    "currency_symbol": "DH",
    // ... other settings
}
```

### Update Settings

```javascript
PUT /api/settings
Body: {
    "settings": {
        "app_name": "My App",
        "currency_symbol": "$",
        // ... other settings
    }
}
Response: {
    "message": "Settings updated successfully"
}
```

### Get Settings by Group

```javascript
GET /api/settings?group=currency
Response: {
    "currency_code": "MAD",
    "currency_symbol": "DH",
    // ... other currency settings
}
```

## Default Values

The system ships with sensible defaults for Morocco:

- Currency: MAD (Moroccan Dirham)
- Timezone: Africa/Casablanca
- Language: English
- Currency Symbol: DH
- Currency Position: After amount
- Commission: 10% enabled

## Usage Examples

### Example 1: Display Formatted Currency

```jsx
import { useSettings } from '../contexts/SettingsContext';

function ProductPrice({ price }) {
    const { formatCurrency } = useSettings();
    
    return (
        <div className="price">
            {formatCurrency(price)}
        </div>
    );
}
```

### Example 2: Use App Name Dynamically

```jsx
import { useSettings } from '../contexts/SettingsContext';

function Header() {
    const { settings } = useSettings();
    
    return (
        <header>
            <h1>{settings.app_name}</h1>
            <p>{settings.app_description}</p>
        </header>
    );
}
```

### Example 3: Check Notification Settings

```jsx
import { useSettings } from '../contexts/SettingsContext';

function sendNotification(message) {
    const { settings } = useSettings();
    
    if (!settings.notifications_enabled) {
        return;
    }
    
    if (settings.notifications_email) {
        // Send email notification
    }
    
    if (settings.notifications_sms) {
        // Send SMS notification
    }
}
```

## Notes

- Settings are loaded once on app initialization and cached in context
- Changes to settings are immediately reflected across the entire application
- The `formatCurrency` helper ensures consistent currency formatting
- All settings have fallback defaults to prevent errors
- Settings can be extended by adding new entries to the seeder

## Future Enhancements

Potential improvements:

1. Logo upload functionality
2. Email template customization
3. Multi-language support
4. Custom theme colors
5. Backup and restore settings
6. Settings history/audit log
7. Role-based settings access
8. Advanced notification rules

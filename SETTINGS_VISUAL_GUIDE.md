# Settings System - Visual Guide

## Settings Page Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  Settings                                    [💾 Save Changes]         │
│  Manage your application settings and preferences                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐  ┌────────────────────────────────────────────────────┐ │
│  │ 🌍 General│  │  General Settings                                  │ │
│  │ 💵 Currency│ │  Configure basic application settings              │ │
│  │ 🏢 Company │  │  ───────────────────────────────────────────────── │ │
│  │ 🛒 Orders  │  │                                                    │ │
│  │ 🔔 Notif.  │  │  Application Name:  [Livraison              ]     │ │
│  │ 💹 Commis. │  │  This name appears in the sidebar and browser     │ │
│  └──────────┘  │                                                      │ │
│                 │  App Description:   [Admin Panel            ]       │ │
│                 │  Brief description shown under the app name         │ │
│                 │                                                      │ │
│                 │  Timezone:          [Africa/Casablanca ▼]           │ │
│                 │                                                      │ │
│                 │  Language:          [English ▼]                     │ │
│                 │                                                      │ │
│                 └────────────────────────────────────────────────────┘ │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

## Tab Sections

### 1. General Tab
```
┌─────────────────────────────────────────────────────────┐
│ 🌍 General Settings                                     │
│ Configure basic application settings                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Application Name        Application Description        │
│  ┌────────────────┐     ┌────────────────┐            │
│  │ Livraison      │     │ Admin Panel    │            │
│  └────────────────┘     └────────────────┘            │
│                                                          │
│  Timezone                Language                        │
│  ┌────────────────┐     ┌────────────────┐            │
│  │ Africa/Casa... ▼│    │ English      ▼ │            │
│  └────────────────┘     └────────────────┘            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 2. Currency Tab
```
┌─────────────────────────────────────────────────────────┐
│ 💵 Currency Settings                                    │
│ Configure currency display and formatting               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Currency Code           Currency Symbol                │
│  ┌────────────────┐     ┌────────────────┐            │
│  │ MAD            │     │ DH             │            │
│  └────────────────┘     └────────────────┘            │
│  ISO 4217 code          Symbol displayed                │
│                                                          │
│  Currency Position       Decimal Places                 │
│  ┌────────────────┐     ┌────────────────┐            │
│  │ After amount ▼ │     │ 2              │            │
│  └────────────────┘     └────────────────┘            │
│                                                          │
│  ┌────────────────────────────────────────────────┐   │
│  │ ℹ️ Preview: 1,234.55 DH                        │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3. Company Tab
```
┌─────────────────────────────────────────────────────────┐
│ 🏢 Company Information                                  │
│ Manage company details and contact information          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Company Name                                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Livraison Company                                 │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  📧 Email              📞 Phone                         │
│  ┌──────────────┐     ┌──────────────┐                │
│  │ contact@...  │     │ +212 600...  │                │
│  └──────────────┘     └──────────────┘                │
│                                                          │
│  📍 Address                                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Casablanca, Morocco                               │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 4. Orders Tab
```
┌─────────────────────────────────────────────────────────┐
│ 🛒 Order Settings                                       │
│ Configure order management preferences                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Order Prefix            Low Stock Threshold            │
│  ┌────────────────┐     ┌────────────────┐            │
│  │ ORD-           │     │ 10             │            │
│  └────────────────┘     └────────────────┘            │
│  e.g., ORD-001          Alert when below               │
│                                                          │
│  ☑️ Auto-confirm orders                                 │
│     Automatically confirm new orders                    │
│                                                          │
│  ☑️ Enable low stock warnings                           │
│     Show alerts when products are low                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 5. Notifications Tab
```
┌─────────────────────────────────────────────────────────┐
│ 🔔 Notification Preferences                             │
│ Control how and when you receive notifications          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ☑️ Enable notifications                                │
│     Master switch for all notifications                 │
│                                                          │
│     ☑️ Email notifications                              │
│        Receive notifications via email                  │
│                                                          │
│     ☐ SMS notifications                                 │
│        Receive notifications via SMS                    │
│                                                          │
│  Event Notifications                                     │
│  ───────────────────                                    │
│     ☑️ New order notifications                          │
│     ☑️ Low stock alerts                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 6. Commission Tab
```
┌─────────────────────────────────────────────────────────┐
│ 💹 Commission Settings                                  │
│ Configure commission rates and calculations             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ☑️ Enable commission system                            │
│     Track and calculate commissions                     │
│                                                          │
│  Commission Type         Commission Value               │
│  ┌────────────────┐     ┌────────────────┐            │
│  │ Percentage   ▼ │     │ 10          % │            │
│  └────────────────┘     └────────────────┘            │
│                                                          │
│  ┌────────────────────────────────────────────────┐   │
│  │ ℹ️ Example: For 1,000 DH, commission = 100 DH │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Color Scheme

```
┌────────────────────────────────────────┐
│  Tab Icons & Colors:                   │
│  ────────────────────                  │
│  🌍 General     - Blue/Indigo          │
│  💵 Currency    - Green                │
│  🏢 Company     - Purple               │
│  🛒 Orders      - Orange               │
│  🔔 Notifications - Yellow             │
│  💹 Commission  - Pink                 │
└────────────────────────────────────────┘
```

## Responsive Behavior

### Desktop View (1200px+)
```
┌─────────────────────────────────────────────────────────┐
│  [Sidebar Tabs]  |  [Content Area]                      │
│  ───────────────────────────────────────────────────────│
│  5-column grid   |  Large forms with 2 columns          │
│  Sticky tabs     |  Save button top-right               │
└─────────────────────────────────────────────────────────┘
```

### Tablet View (768px - 1199px)
```
┌────────────────────────────────────────┐
│  [Sidebar Tabs]                        │
│  ──────────────────────────────────────│
│  [Content Area]                        │
│  ──────────────────────────────────────│
│  1-column grid for tabs                │
│  Single column forms                   │
│  Save button full-width                │
└────────────────────────────────────────┘
```

### Mobile View (< 768px)
```
┌──────────────────────┐
│  [Tab Dropdown]      │
│  ────────────────────│
│  [Content]           │
│  ────────────────────│
│  Stack layout        │
│  Touch-friendly      │
│  [Save Button]       │
└──────────────────────┘
```

## User Interactions

### Saving Settings
```
1. User modifies any field
2. Clicks "Save Changes" button
3. Button shows "Saving..." with spinner
4. Success message appears: "✅ Settings saved successfully!"
5. Message auto-dismisses after 3 seconds
6. Changes apply immediately across app
```

### Tab Navigation
```
1. Click tab in sidebar
2. Smooth transition to tab content
3. Active tab highlighted with gradient
4. Form fields auto-focus
```

### Live Previews
```
Currency Preview:
┌──────────────────────────────────────┐
│ Preview: 1,234.55 DH                 │
└──────────────────────────────────────┘

Commission Preview:
┌──────────────────────────────────────┐
│ Example: For 1,000 DH,               │
│ commission = 100 DH (10%)            │
└──────────────────────────────────────┘
```

## Visual States

### Active Tab
```
┌────────────────────────┐
│ 🌍 General            │  ← Gradient blue background
└────────────────────────┘     White text
                               Shadow effect
```

### Inactive Tab
```
┌────────────────────────┐
│ 💵 Currency           │  ← Gray text
└────────────────────────┘     Hover effect
```

### Success Message
```
┌─────────────────────────────────────────┐
│ ✅ Settings saved successfully!        │  ← Green background
└─────────────────────────────────────────┘     Green border
```

### Error Message
```
┌─────────────────────────────────────────┐
│ ❌ Failed to save settings             │  ← Red background
└─────────────────────────────────────────┘     Red border
```

## Accessibility Features

- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Clear focus indicators
- ✅ ARIA labels
- ✅ Semantic HTML
- ✅ Sufficient color contrast
- ✅ Large touch targets (mobile)
- ✅ Clear error messages

## Animation Effects

- Smooth tab transitions (200ms)
- Fade-in for success messages
- Slide-in for error messages
- Hover effects on tabs and buttons
- Loading spinner during save
- Pulse effect on save button

This visual guide provides a complete overview of the settings system's user interface and user experience.

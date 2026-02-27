# UI Changes - Visual Guide

## 1. Order List Page

### New Delivery Column
Added a new column "Delivery" in the orders table that displays:
- **Tracking Code** (in blue, clickable)
- **Provider Name** (bmdelivery or tawsilex)
- **Delivery Status** (in purple, e.g., "in transit", "delivered")

Location: Between "Status" and "Delivery Person" columns

```
| Status    | Delivery              | Delivery Person |
|-----------|-----------------------|-----------------|
| Confirmed | BM123456              | John Doe        |
|           | bmdelivery            |                 |
|           | in transit            |                 |
```

## 2. Delivery Company Selection Modal

### When to Appear:
When you change an order status to "confirmed" from the dropdown in the order list.

### Modal Structure:
```
┌────────────────────────────────────────────┐
│  [Truck Icon] Select Delivery Company  [X] │ (Blue header)
├────────────────────────────────────────────┤
│                                            │
│  Choose which delivery company should     │
│  handle this order:                       │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │ ○ [Logo] BMDelivery        [Truck]  │ │ (White, clickable)
│  │        bmdelivery                    │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │ ○ [Logo] Tawsilex          [Truck]  │ │ (White, clickable)
│  │        tawsilex                      │ │
│  └──────────────────────────────────────┘ │
│                                            │
├────────────────────────────────────────────┤
│                  [Cancel] [Confirm & Send] │ (Gray footer)
└────────────────────────────────────────────┘
```

### Interactive States:
- **Hover**: Border changes to gray
- **Selected**: Blue border and background
- **Loading**: Spinner shown while fetching companies
- **Error**: Red alert box if no companies available

## 3. Order Detail Page

### New "Delivery Tracking" Card
Added after "Order Source" card in the right sidebar.

### Card Structure:
```
┌────────────────────────────────────┐
│ [Truck Icon] Delivery Tracking     │
├────────────────────────────────────┤
│                                    │
│ Delivery Company                   │
│ BMDelivery Morocco                 │
│                                    │
│ Tracking Code                      │
│ BM-20260227-1234  (in blue mono)  │
│                                    │
│ Delivery Status                    │
│ [ In Transit ]  (purple pill)     │
│                                    │
│ Sent to Delivery                   │
│ February 27, 2026 at 2:30 PM      │
│                                    │
└────────────────────────────────────┘
```

### Visibility:
- Only shown if order has been sent to a delivery company
- Shows complete delivery tracking information
- Updates automatically when status changes

## 4. Status Dropdown Enhancement

### Behavior Change:
When selecting "Confirmed" status:
- **Before**: Status changes immediately
- **Now**: Modal appears first, then status changes after company selection

Other statuses (Pending, Shipped, Delivered, Cancelled) work as before - immediate update without modal.

## 5. Visual Indicators

### Color Coding:
- **Blue**: Tracking codes, links, primary actions
- **Purple**: Delivery statuses
- **Gray**: Provider names, secondary info
- **Green**: Success states
- **Red**: Errors, cancelled states

### Icons:
- **Truck Icon**: Delivery-related information
- **X Icon**: Close modal
- **Spinner**: Loading states

## 6. Error States

### No Active Integrations:
```
┌────────────────────────────────────────────┐
│  [!] No active delivery companies found.  │ (Red alert box)
│  Please configure delivery integrations    │
│  first.                                    │
└────────────────────────────────────────────┘
```

### Failed to Send:
```
Toast notification:
"Failed to send order to delivery company"
```

## 7. Loading States

### Modal Loading:
- Centered spinner while fetching delivery companies
- "Confirming..." text with spinner on button when sending

### Status Update:
- Dropdown shows opacity 50% while updating
- Row slightly faded during status change

## 8. Responsive Design

### Desktop (> 1024px):
- Full table with all columns visible
- Modal centered on screen
- All information displayed

### Tablet (768px - 1024px):
- Table scrollable horizontally
- Modal full width
- Columns may wrap

### Mobile (< 768px):
- Table becomes card-based layout
- Modal takes full screen
- Touch-optimized buttons

## 9. Accessibility Features

- **Keyboard Navigation**: Modal can be closed with Escape key
- **Screen Readers**: All icons have descriptive labels
- **Focus Management**: Focus trapped in modal when open
- **Color Contrast**: All text meets WCAG AA standards

## 10. User Feedback

### Success:
- Status change reflected immediately in list
- Tracking information appears in order details
- Green success toast (future enhancement)

### Error:
- Red error message in modal
- Status reverts if update fails
- Detailed error message from server

## 11. Animation & Transitions

- **Modal**: Fade in/out with backdrop
- **Status Change**: Smooth color transition
- **Hover States**: Subtle scale and shadow effects
- **Loading**: Smooth spinner rotation

## Screenshot Descriptions

### 1. Order List with Delivery Column
```
Date     | ID      | Client | Status    | Delivery       | Actions
---------|---------|--------|-----------|----------------|--------
Feb 27   | ORD-001 | John   | Confirmed | BM123456      | [Icons]
         |         |        |           | bmdelivery     |
         |         |        |           | in transit     |
```

### 2. Delivery Modal Open
```
Background dimmed with modal centered:
- Header: Blue with truck icon
- Body: List of delivery companies with radio buttons
- Footer: Gray with action buttons
- Selected company has blue border
```

### 3. Order Details with Tracking
```
Right sidebar cards:
1. Client Information (existing)
2. Shipping Information (existing)
3. Agents & Delivery (existing)
4. Order Source (existing)
5. Delivery Tracking (NEW - with all tracking info)
```

## Tips for Users

1. **To send order to delivery company**: Change status to "Confirmed" and select company in modal
2. **To view tracking info**: Click order number to go to details page
3. **To check delivery status**: Look at purple badge in delivery column
4. **If modal doesn't appear**: Check that you have active delivery integrations configured
5. **To resend order**: Contact support (manual process for now)

## Future UI Enhancements

Potential improvements:
- Click tracking code to copy to clipboard
- Direct link to delivery company's tracking page
- Timeline view of delivery status changes
- Estimated delivery date display
- Customer notification toggle
- Bulk actions for multiple orders
- Delivery cost display

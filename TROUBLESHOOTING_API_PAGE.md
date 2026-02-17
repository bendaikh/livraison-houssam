# Troubleshooting: API Integrations Page Shows Nothing

## ✅ Status Check

Your database now has **3 example integrations**:
1. Example Shopify Store (shopify)
2. Tawsilex Delivery (tawsilex)
3. BMDelivery Service (bmdelivery)

## 🔍 Why You See Nothing

The API Integrations page is empty because of one of these reasons:

### 1. **Not Authenticated** (Most Common)
- The API endpoint requires authentication
- You need to be logged in with a valid token
- Check if you're logged in to the application

### 2. **Frontend Not Fetching Data**
- The frontend might not be making the API call
- Check browser console for errors (F12 → Console tab)

### 3. **CORS or API Issues**
- API might be blocked by CORS
- Check browser Network tab (F12 → Network)

---

## 🔧 Quick Fixes

### Fix 1: Test the API Directly

Open a new terminal and run:

```bash
# First, create a token for testing
php artisan tinker --execute="echo App\Models\User::first()->createToken('test')->plainTextToken;"
```

Copy the token, then test the API:

```bash
# Replace YOUR_TOKEN with the token from above
curl -X GET http://localhost:8000/api/api-integrations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

**Expected Result**: You should see JSON with 3 integrations.

---

### Fix 2: Check Browser Console

1. Open the API Integrations page
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Look for any red errors
5. Go to **Network** tab
6. Refresh the page
7. Look for the request to `/api/api-integrations`
8. Check if it's returning data or an error

---

### Fix 3: Verify Authentication

Check if you're logged in:

```bash
# Check your current session
php artisan tinker --execute="echo 'Users count: ' . App\Models\User::count();"
```

If you need to login:
1. Go to the login page
2. Use credentials: `superadmin@ecommerce.com` / (your password)
3. After login, go back to API Integrations page

---

### Fix 4: Check Frontend Code

The frontend should be making a request like this:

```javascript
// Example frontend code
fetch('/api/api-integrations', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

---

## 🧪 Test Commands

### 1. Check if integrations exist:
```bash
php artisan tinker --execute="echo 'Total: ' . App\Models\ApiIntegration::count();"
```

### 2. List all integrations:
```bash
php test_api_integrations.php
```

### 3. Create a test token:
```bash
php artisan tinker --execute="echo App\Models\User::first()->createToken('test')->plainTextToken;"
```

### 4. Test API with curl:
```bash
curl -X GET http://localhost:8000/api/api-integrations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

---

## 📝 Manual Test via Postman

1. Open Postman
2. Import `postman_collection_example.json`
3. Set variables:
   - `base_url`: `http://localhost:8000/api`
   - `auth_token`: Your authentication token
4. Run "List All Integrations" request

---

## 🎯 Expected API Response

When you call `/api/api-integrations`, you should get:

```json
[
  {
    "id": 1,
    "name": "Example Shopify Store",
    "type": "shopify",
    "provider": "shopify",
    "is_active": false,
    "credentials": {
      "shop_url": "https://example-store.myshopify.com",
      "access_token": "shpat_example_token_replace_with_real"
    },
    "settings": {
      "auto_sync": false,
      "sync_interval": 3600,
      "import_fulfilled_orders": true
    },
    "last_sync_at": null,
    "created_at": "2026-02-17T...",
    "updated_at": "2026-02-17T..."
  },
  // ... 2 more integrations
]
```

---

## 🔑 Get Your Authentication Token

### Method 1: Via Tinker
```bash
php artisan tinker
```

Then in tinker:
```php
$user = App\Models\User::first();
$token = $user->createToken('api-test');
echo $token->plainTextToken;
exit
```

### Method 2: Via Login API
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@ecommerce.com","password":"YOUR_PASSWORD"}'
```

---

## 🚀 Next Steps

1. **Get your auth token** using one of the methods above
2. **Test the API** with curl or Postman
3. **Check browser console** when viewing the page
4. **Verify frontend code** is making the correct API call

---

## 📞 Still Not Working?

If you still see nothing after these steps, please check:

1. Is the Laravel server running? (`php artisan serve`)
2. Is the frontend dev server running? (if using Vite/npm)
3. Are there any errors in `storage/logs/laravel.log`?
4. What do you see in the browser console (F12)?
5. What do you see in the Network tab when loading the page?

Share the error messages and I can help further!

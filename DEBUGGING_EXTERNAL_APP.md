# 🐛 DEBUGGING GUIDE - External App API Integration

## Current Status
- ✅ **Authentication**: WORKING (no 401 errors)
- ❌ **Data Submission**: FAILING (422 validation errors)

## The Problem
Your external app is sending an **EMPTY or INCOMPLETE** request body to the API. The Laravel backend is not receiving the required fields.

## 🔍 What to Check in Your External App

### 1. Verify Request Body is Being Sent

**The issue is likely one of these:**

#### A) Request body is completely empty
```javascript
// ❌ WRONG - No body sent
fetch('https://smanager.site/api/orders', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ...' }
  // Missing body!
});

// ✅ CORRECT
fetch('https://smanager.site/api/orders', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer capi_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    client_name: "John Doe",
    client_phone: "0612345678",
    source: "whatsapp",
    items: [...]
  })
});
```

#### B) Content-Type header is missing or wrong
```javascript
// ❌ WRONG - Missing Content-Type
headers: {
  'Authorization': 'Bearer ...'
}

// ✅ CORRECT
headers: {
  'Authorization': 'Bearer ...',
  'Content-Type': 'application/json'  // ← REQUIRED!
}
```

#### C) Body is not JSON stringified
```javascript
// ❌ WRONG - Sending object directly
body: { client_name: "John" }

// ✅ CORRECT - Stringify for fetch
body: JSON.stringify({ client_name: "John" })

// ✅ CORRECT - For axios/http clients that auto-stringify
data: { client_name: "John" }
```

#### D) Variable names are incorrect
```javascript
// ❌ WRONG - Using wrong variable names
{
  "name": "John Doe",        // Should be "client_name"
  "phone": "0612345678",     // Should be "client_phone"
  "type": "whatsapp",        // Should be "source"
  "products": [...]          // Should be "items"
}

// ✅ CORRECT - Exact field names
{
  "client_name": "John Doe",
  "client_phone": "0612345678",
  "source": "whatsapp",
  "items": [...]
}
```

### 2. Test with cURL First

Before fixing your app code, test that the API works with a simple cURL command:

```bash
curl -X POST https://smanager.site/api/orders \
  -H "Authorization: Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "client_name": "Test Customer",
    "client_phone": "0612345678",
    "source": "whatsapp",
    "items": [
      {
        "product_id": 1,
        "quantity": 1,
        "price": 100
      }
    ]
  }'
```

If this works, then your app code is the problem.

### 3. Add Debug Logging in Your External App

Add logging RIGHT BEFORE sending the request:

```javascript
// JavaScript/Node.js example
const requestData = {
  client_name: leadData.name,
  client_phone: leadData.phone,
  source: "whatsapp",
  items: [{
    product_id: leadData.product_id,
    quantity: 1,
    price: leadData.price
  }]
};

console.log('=== SENDING TO API ===');
console.log('URL:', 'https://smanager.site/api/orders');
console.log('Headers:', headers);
console.log('Body:', JSON.stringify(requestData, null, 2));

// Then send the request
const response = await fetch(url, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify(requestData)
});

console.log('Response Status:', response.status);
console.log('Response Body:', await response.text());
```

```python
# Python example
import requests
import json

data = {
    "client_name": lead_data["name"],
    "client_phone": lead_data["phone"],
    "source": "whatsapp",
    "items": [{
        "product_id": lead_data["product_id"],
        "quantity": 1,
        "price": lead_data["price"]
    }]
}

print("=== SENDING TO API ===")
print(f"URL: {url}")
print(f"Headers: {headers}")
print(f"Body: {json.dumps(data, indent=2)}")

response = requests.post(url, json=data, headers=headers)

print(f"Response Status: {response.status_code}")
print(f"Response Body: {response.text}")
```

```php
// PHP example
$data = [
    'client_name' => $leadData['name'],
    'client_phone' => $leadData['phone'],
    'source' => 'whatsapp',
    'items' => [[
        'product_id' => $leadData['product_id'],
        'quantity' => 1,
        'price' => $leadData['price']
    ]]
];

error_log("=== SENDING TO API ===");
error_log("URL: $url");
error_log("Headers: " . json_encode($headers));
error_log("Body: " . json_encode($data));

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);

error_log("Response Status: $status");
error_log("Response Body: $response");
```

## 🔧 Common Fixes by Language/Framework

### Laravel (if your external app is Laravel)

```php
// In your controller or service class
use Illuminate\Support\Facades\Http;

$response = Http::withHeaders([
    'Authorization' => 'Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0',
    'Accept' => 'application/json',
])
->post('https://smanager.site/api/orders', [
    'client_name' => $leadData->name,
    'client_phone' => $leadData->phone,
    'source' => 'whatsapp',
    'items' => [[
        'product_id' => $leadData->product_id,
        'quantity' => 1,
        'price' => $leadData->price,
    ]],
]);

if ($response->successful()) {
    $order = $response->json();
    \Log::info('Order created', ['order_id' => $order['id']]);
} else {
    \Log::error('Order creation failed', [
        'status' => $response->status(),
        'body' => $response->body()
    ]);
}
```

### Node.js/Express

```javascript
const axios = require('axios');

try {
  const response = await axios.post('https://smanager.site/api/orders', {
    client_name: leadData.name,
    client_phone: leadData.phone,
    source: 'whatsapp',
    items: [{
      product_id: leadData.product_id,
      quantity: 1,
      price: leadData.price
    }]
  }, {
    headers: {
      'Authorization': 'Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
  
  console.log('Order created:', response.data);
} catch (error) {
  console.error('Order creation failed:', error.response?.data || error.message);
}
```

### Python/Django

```python
import requests

response = requests.post(
    'https://smanager.site/api/orders',
    json={
        'client_name': lead_data['name'],
        'client_phone': lead_data['phone'],
        'source': 'whatsapp',
        'items': [{
            'product_id': lead_data['product_id'],
            'quantity': 1,
            'price': lead_data['price']
        }]
    },
    headers={
        'Authorization': 'Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
)

if response.ok:
    order = response.json()
    print(f"Order created: {order['id']}")
else:
    print(f"Order creation failed: {response.text}")
```

## 📋 Checklist for Your External App

- [ ] API key is correct: `capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0`
- [ ] Content-Type header is set to `application/json`
- [ ] Authorization header includes `Bearer ` prefix
- [ ] Request body includes `client_name` field
- [ ] Request body includes `client_phone` field
- [ ] Request body includes `source` field (set to "whatsapp" or "marketplace")
- [ ] Request body includes `items` array with at least one item
- [ ] Each item has `product_id`, `quantity`, and `price`
- [ ] Body is JSON stringified (if using fetch API)
- [ ] Debug logging is added to see what's actually being sent

## 🚨 Most Likely Issue

Based on the error, your app is probably:
1. **Not sending the request body at all**, OR
2. **Sending it with wrong Content-Type** (like form-data instead of JSON), OR
3. **Using wrong field names** (like "name" instead of "client_name")

## 📞 Next Steps

1. Add the debug logging shown above
2. Run your external app and trigger order creation
3. Check your external app's logs to see what's actually being sent
4. Compare with the required format
5. Share the debug output with me if still stuck

## ✅ Expected Working Request

```http
POST /api/orders HTTP/1.1
Host: smanager.site
Authorization: Bearer capi_c2cb5c31f7822fe7ba18bb155d6ccb9367212787f9b5a7304415f0a9b92fb8b0
Content-Type: application/json
Accept: application/json

{
  "client_name": "John Doe",
  "client_phone": "0612345678",
  "source": "whatsapp",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": 100
    }
  ]
}
```

---

**The Laravel backend is now logging all incoming requests. Check `storage/logs/laravel.log` after your next attempt to see what data is actually arriving.**

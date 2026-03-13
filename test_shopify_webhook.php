≥<?php

// Test Shopify Webhook Integration
// This script simulates a Shopify order creation webhook

$webhookUrl = 'http://localhost:8000/api/webhooks/shopify/orders/create';
$webhookSecret = 'your-webhook-secret-here'; // Replace with your actual webhook secret

// Sample Shopify order data
$orderData = [
    'id' => 12345678901,
    'name' => '#TEST1001',
    'email' => 'test@example.com',
    'created_at' => date('c'),
    'updated_at' => date('c'),
    'total_price' => '149.99',
    'subtotal_price' => '139.99',
    'total_tax' => '10.00',
    'total_discounts' => '0.00',
    'currency' => 'USD',
    'financial_status' => 'paid',
    'fulfillment_status' => null,
    'customer' => [
        'id' => 98765432109,
        'email' => 'customer@example.com',
        'first_name' => 'John',
        'last_name' => 'Doe',
        'phone' => '+1234567890',
    ],
    'line_items' => [
        [
            'id' => 111222333444,
            'product_id' => 555666777888,
            'variant_id' => 999000111222,
            'title' => 'Test Product',
            'name' => 'Test Product - Medium',
            'quantity' => 2,
            'price' => '69.99',
            'sku' => 'TEST-PROD-001',
        ],
    ],
    'shipping_address' => [
        'address1' => '123 Test Street',
        'address2' => 'Apt 4B',
        'city' => 'Casablanca',
        'province' => 'Grand Casablanca',
        'country' => 'Morocco',
        'zip' => '20000',
        'phone' => '+212612345678',
    ],
    'note' => 'Test order from webhook',
];

// Convert order data to JSON
$jsonData = json_encode($orderData);

// Calculate HMAC signature (same as Shopify does)
$hmac = base64_encode(hash_hmac('sha256', $jsonData, $webhookSecret, true));

// Prepare headers
$headers = [
    'Content-Type: application/json',
    'X-Shopify-Hmac-SHA256: ' . $hmac,
    'X-Shopify-Topic: orders/create',
    'X-Shopify-Shop-Domain: test-store.myshopify.com',
];

echo "Testing Shopify Webhook Integration\n";
echo "====================================\n\n";
echo "Webhook URL: $webhookUrl\n";
echo "Order ID: {$orderData['id']}\n";
echo "Order Name: {$orderData['name']}\n\n";

// Send the webhook request
$ch = curl_init($webhookUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "Response Code: $httpCode\n";

if ($error) {
    echo "Error: $error\n";
} else {
    echo "Response:\n";
    echo json_encode(json_decode($response), JSON_PRETTY_PRINT) . "\n";
}

echo "\n";
echo "To use this test:\n";
echo "1. Make sure your Laravel app is running (php artisan serve)\n";
echo "2. Update the \$webhookSecret variable with your actual webhook secret\n";
echo "3. Run: php test_shopify_webhook.php\n";

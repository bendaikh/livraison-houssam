<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\VendorController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\ExpenseCategoryController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\ApiIntegrationController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\WebhookController;
use App\Http\Controllers\CityController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Webhook routes (public - no authentication required)
Route::post('/webhooks/shopify/orders/create', [WebhookController::class, 'handleShopifyOrderCreate']);
Route::post('/webhooks/bmdelivery/status-update', [WebhookController::class, 'handleBMDeliveryWebhook']);
Route::post('/webhooks/tawsilex/status-update', [WebhookController::class, 'handleTawsilexWebhook']);
Route::post('/webhooks/test', [WebhookController::class, 'testWebhook']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Products
    Route::apiResource('products', ProductController::class);
    Route::delete('/products/{product}/images', [ProductController::class, 'deleteImage']);

    // Categories
    Route::apiResource('categories', CategoryController::class);

    // Orders
    Route::get('/orders/delivery-companies/available', [OrderController::class, 'getAvailableDeliveryCompanies']);
    Route::apiResource('orders', OrderController::class);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::patch('/orders/{order}/assign-agent', [OrderController::class, 'assignDeliveryAgent']);

    // Clients
    Route::apiResource('clients', ClientController::class);

    // Vendors
    Route::apiResource('vendors', VendorController::class);
    Route::get('/vendors/{vendor}/sales-report', [VendorController::class, 'salesReport']);

    // Expenses
    Route::apiResource('expenses', ExpenseController::class);
    Route::get('/expenses-report', [ExpenseController::class, 'report']);
    Route::apiResource('expense-categories', ExpenseCategoryController::class);

    // Stock Management
    Route::post('/stock/add', [StockController::class, 'addStock']);
    Route::post('/stock/remove', [StockController::class, 'removeStock']);
    Route::post('/stock/adjust', [StockController::class, 'adjustStock']);
    Route::get('/stock/history', [StockController::class, 'history']);
    Route::get('/stock/low-stock', [StockController::class, 'lowStock']);

    // Marketplace Management
    Route::get('/marketplace', [MarketplaceController::class, 'index']);
    Route::get('/marketplace/statistics', [MarketplaceController::class, 'statistics']);
    Route::get('/marketplace/vendor-products', [MarketplaceController::class, 'vendorProducts']);
    Route::get('/marketplace/products/{product}', [MarketplaceController::class, 'show']);
    Route::post('/marketplace/products/{product}/assign', [MarketplaceController::class, 'assignVendor']);
    Route::patch('/marketplace/assignments/{marketplaceProduct}', [MarketplaceController::class, 'updateAssignment']);
    Route::post('/marketplace/assignments/{marketplaceProduct}/toggle', [MarketplaceController::class, 'toggleActivation']);
    Route::delete('/marketplace/assignments/{marketplaceProduct}', [MarketplaceController::class, 'removeAssignment']);
    Route::post('/marketplace/bulk-assign', [MarketplaceController::class, 'bulkAssign']);
    Route::post('/marketplace/bulk-toggle', [MarketplaceController::class, 'bulkToggle']);

    // API Integrations
    Route::apiResource('api-integrations', ApiIntegrationController::class);
    Route::post('/api-integrations/{apiIntegration}/sync', [ApiIntegrationController::class, 'sync']);
    Route::get('/api-integrations/{apiIntegration}/logs', [ApiIntegrationController::class, 'logs']);
    Route::post('/api-integrations/{apiIntegration}/test-connection', [ApiIntegrationController::class, 'testConnection']);
    Route::get('/api-integrations/{apiIntegration}/details', [ApiIntegrationController::class, 'getIntegrationDetails']);
    Route::post('/api-integrations/{apiIntegration}/create-shipment', [ApiIntegrationController::class, 'createShipment']);
    Route::post('/api-integrations/{apiIntegration}/track-shipment', [ApiIntegrationController::class, 'trackShipment']);
    Route::get('/api-integrations/{apiIntegration}/cities', [ApiIntegrationController::class, 'getCities']);
    Route::get('/api-integrations/{apiIntegration}/statuses', [ApiIntegrationController::class, 'getStatuses']);

    // Users & Roles (Admin and SuperAdmin only)
    Route::middleware(['role:admin,superadmin'])->group(function () {
        Route::apiResource('users', UserController::class);
        Route::apiResource('roles', RoleController::class);
    });
    Route::get('/delivery-agents', [UserController::class, 'deliveryAgents']);
    Route::get('/delivery-persons', [UserController::class, 'deliveryPersons']);
    Route::get('/confirmation-agents', [UserController::class, 'confirmationAgents']);

    // Settings
    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update']);
    Route::get('/settings/{key}', [SettingController::class, 'get']);

    // Cities
    Route::apiResource('cities', CityController::class);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);
});

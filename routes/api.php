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
use App\Http\Controllers\GoogleOAuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\BlacklistController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\WebhookController;
use App\Http\Controllers\CityController;
use App\Http\Controllers\ConfirmationAgentBillingController;
use App\Http\Controllers\DeliveryPersonBillingController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public routes
Route::get('/google/oauth/callback', [GoogleOAuthController::class, 'callback']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Public app settings (used by public homepage too)
Route::get('/app-settings', [SettingController::class, 'appSettings']);

// Public marketplace routes
Route::prefix('public')->group(function () {
    Route::get('/products', [ProductController::class, 'publicIndex']);
});

// Seller registration
Route::post('/seller/register', [VendorController::class, 'register']);

// Webhook routes (public - no authentication required)
Route::post('/webhooks/shopify/orders/create', [WebhookController::class, 'handleShopifyOrderCreate']);
Route::post('/webhooks/bmdelivery/status-update', [WebhookController::class, 'handleBMDeliveryWebhook']);
Route::post('/webhooks/tawsilex/status-update', [WebhookController::class, 'handleTawsilexWebhook']);
Route::post('/webhooks/test', [WebhookController::class, 'testWebhook']);

// External API routes (authenticated with custom API keys)
Route::middleware('auth.custom_api')->prefix('external')->group(function () {
    // Orders - external API access
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::patch('/orders/{order}', [OrderController::class, 'update']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    
    // Products - external API access
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{product}', [ProductController::class, 'show']);
    
    // Clients - external API access
    Route::get('/clients', [ClientController::class, 'index']);
    Route::post('/clients', [ClientController::class, 'store']);
    Route::get('/clients/{client}', [ClientController::class, 'show']);
});

// Test authentication endpoint
Route::middleware('auth.custom_api')->get('/test-auth', function (Request $request) {
    $integration = $request->attributes->get('api_integration');
    
    return response()->json([
        'message' => 'Authentication successful!',
        'integration' => [
            'id' => $integration->id,
            'name' => $integration->name,
            'type' => $integration->type,
            'provider' => $integration->provider,
            'vendor_id' => $integration->vendor_id,
        ],
        'authenticated_user' => auth()->check() ? [
            'id' => auth()->user()->id,
            'name' => auth()->user()->name,
            'email' => auth()->user()->email,
            'role' => auth()->user()->role->name ?? null,
        ] : null,
        'headers_received' => [
            'Authorization' => $request->header('Authorization') ? 'Bearer capi_***' : 'Not provided',
            'Content-Type' => $request->header('Content-Type'),
            'Accept' => $request->header('Accept'),
        ],
    ]);
});

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Products
    Route::apiResource('products', ProductController::class);
    Route::delete('/products/{product}/images', [ProductController::class, 'deleteImage']);

    // Categories
    Route::apiResource('categories', CategoryController::class);

    // Clients
    Route::get('/client-intelligence', [ClientController::class, 'intelligence']);
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

    // Blacklist
    Route::get('/blacklist', [BlacklistController::class, 'index']);
    Route::post('/blacklist', [BlacklistController::class, 'store']);
    Route::put('/blacklist/{blacklist}', [BlacklistController::class, 'update']);
    Route::delete('/blacklist/{blacklist}', [BlacklistController::class, 'destroy']);

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
    Route::get('/api-integrations/{apiIntegration}/google/oauth/url', [GoogleOAuthController::class, 'authorizationUrl']);
    Route::get('/api-integrations/{apiIntegration}/google/spreadsheets', [GoogleOAuthController::class, 'spreadsheets']);
    Route::post('/api-integrations/{apiIntegration}/google/disconnect', [GoogleOAuthController::class, 'disconnect']);
    Route::get('/api-integrations/{apiIntegration}/google-sheet/tabs', [ApiIntegrationController::class, 'listGoogleSheetTabs']);
    Route::post('/api-integrations/{apiIntegration}/google-sheet/preview', [ApiIntegrationController::class, 'previewGoogleSheet']);
    Route::get('/api-integrations/{apiIntegration}/google-sheet/connections', [ApiIntegrationController::class, 'listGoogleSheetConnections']);
    Route::post('/api-integrations/{apiIntegration}/google-sheet/connections', [ApiIntegrationController::class, 'storeGoogleSheetConnection']);
    Route::delete('/api-integrations/{apiIntegration}/google-sheet/connections/{connectionKey}', [ApiIntegrationController::class, 'destroyGoogleSheetConnection'])->where('connectionKey', '.*');
    Route::post('/api-integrations/custom-api/generate-key', [ApiIntegrationController::class, 'generateCustomApiKey']);

    // Users & Roles (Admin and SuperAdmin only)
    Route::middleware(['role:admin,superadmin'])->group(function () {
        Route::apiResource('users', UserController::class);
        Route::apiResource('roles', RoleController::class);
    });
    Route::get('/delivery-agents', [UserController::class, 'deliveryAgents']);
    Route::get('/delivery-persons', [UserController::class, 'deliveryPersons']);
    Route::get('/confirmation-agents', [UserController::class, 'confirmationAgents']);

    // Shared app settings
    // Settings
    Route::middleware(['role:admin,superadmin'])->group(function () {
        Route::get('/settings', [SettingController::class, 'index']);
        Route::put('/settings', [SettingController::class, 'update']);
        Route::get('/settings/{key}', [SettingController::class, 'get']);
    });

    // Cities
    Route::post('/cities/sync-sources', [CityController::class, 'syncFromSources']);
    Route::apiResource('cities', CityController::class);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);
});

// Orders - accessible via both Sanctum and Custom API authentication
Route::middleware(['auth.api_or_sanctum'])->group(function () {
    Route::get('/orders/delivery-companies/available', [OrderController::class, 'getAvailableDeliveryCompanies']);
    Route::get('/orders/delivery-companies/{integration}/cities', [OrderController::class, 'getDeliveryCities']);
    Route::apiResource('orders', OrderController::class);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::patch('/orders/{order}/delivery-workflow', [OrderController::class, 'updateDeliveryWorkflow']);
    Route::patch('/orders/{order}/assign-agent', [OrderController::class, 'assignDeliveryAgent']);
    Route::post('/orders/{order}/assign-to-me', [OrderController::class, 'assignToMe']);
    Route::patch('/orders/{order}/confirmation-workflow', [OrderController::class, 'updateConfirmationWorkflow']);
    Route::patch('/orders/{order}/confirmation-assignment', [OrderController::class, 'updateConfirmationAssignment']);
    Route::post('/orders/{order}/sync-delivery-status', [OrderController::class, 'syncDeliveryStatus']);

    // Unified billing
    Route::get('/billing', [BillingController::class, 'index']);
    Route::get('/billing/preview', [BillingController::class, 'preview']);
    Route::post('/billing/generate', [BillingController::class, 'generate']);
    Route::get('/billing/{role}/{billingId}/pdf', [BillingController::class, 'downloadPdf']);
    Route::patch('/billing/{role}/{billingId}/mark-paid', [BillingController::class, 'markPaid']);

    // Confirmation billing
    Route::get('/confirmation-billings', [ConfirmationAgentBillingController::class, 'index']);
    Route::post('/confirmation-billings/generate', [ConfirmationAgentBillingController::class, 'generate']);
    Route::patch('/confirmation-billings/{confirmationAgentBilling}/mark-paid', [ConfirmationAgentBillingController::class, 'markPaid']);
    Route::get('/delivery-billings', [DeliveryPersonBillingController::class, 'index']);
    Route::post('/delivery-billings/generate', [DeliveryPersonBillingController::class, 'generate']);
    Route::patch('/delivery-billings/{deliveryPersonBilling}/mark-paid', [DeliveryPersonBillingController::class, 'markPaid']);
});

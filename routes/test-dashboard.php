<?php

use Illuminate\Support\Facades\Route;
use App\Services\DashboardService;

Route::get('/test-dashboard', function () {
    $dashboardService = new DashboardService();
    
    // Test for admin (no vendor filter)
    echo "<h2>Admin Dashboard Data:</h2>";
    $adminData = $dashboardService->getStatistics('daily');
    echo "<pre>";
    print_r([
        'Revenue' => $adminData['revenue'],
        'Orders' => $adminData['orders'],
        'Products' => $adminData['products'],
        'Charts count' => count($adminData['charts']),
        'Recent orders count' => count($adminData['recent_orders']),
        'Top products count' => count($adminData['top_products']),
        'Top clients count' => count($adminData['top_clients']),
    ]);
    echo "</pre>";
    
    // Test for vendor (with vendor filter)
    echo "<h2>Vendor Dashboard Data (Vendor ID: 1):</h2>";
    $vendorData = $dashboardService->getStatistics('daily', 1);
    echo "<pre>";
    print_r([
        'Revenue' => $vendorData['revenue'],
        'Orders' => $vendorData['orders'],
        'Products' => $vendorData['products'],
        'Charts count' => count($vendorData['charts']),
        'Recent orders count' => count($vendorData['recent_orders']),
        'Top products count' => count($vendorData['top_products']),
        'Top clients count' => count($vendorData['top_clients']),
    ]);
    echo "</pre>";
    
    // Check actual database counts
    echo "<h2>Database Verification:</h2>";
    echo "<pre>";
    print_r([
        'Total Orders in DB' => \App\Models\Order::count(),
        'Orders with vendor_id=1' => \App\Models\Order::where('vendor_id', 1)->count(),
        'Total Products' => \App\Models\Product::count(),
        'Total Clients' => \App\Models\Client::count(),
        'Total Vendors' => \App\Models\Vendor::count(),
    ]);
    echo "</pre>";
});

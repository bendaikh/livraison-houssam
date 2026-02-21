<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private DashboardService $dashboardService
    ) {}

    public function index(Request $request)
    {
        $period = $request->get('period', 'daily');
        $user = $request->user();
        $vendorId = null;
        
        // If user is a vendor, get their vendor ID
        if ($user && $user->role && $user->role->slug === 'vendor') {
            $vendor = \App\Models\Vendor::where('user_id', $user->id)->first();
            $vendorId = $vendor?->id;
        }
        
        $statistics = $this->dashboardService->getStatistics($period, $vendorId);

        return response()->json($statistics);
    }
}

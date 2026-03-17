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

        if ($user && $user->isConfirmationAgent()) {
            return response()->json(
                $this->dashboardService->getConfirmationAgentStatistics($period, $user)
            );
        }

        if ($user && $user->isDeliveryPerson()) {
            return response()->json(
                $this->dashboardService->getDeliveryPersonStatistics($period, $user)
            );
        }

        if ($user && $user->isVendor()) {
            $vendor = \App\Models\Vendor::where('user_id', $user->id)->first();
            $vendorId = $vendor?->id;
        }

        $statistics = $this->dashboardService->getStatistics($period, $vendorId);

        return response()->json($statistics);
    }
}

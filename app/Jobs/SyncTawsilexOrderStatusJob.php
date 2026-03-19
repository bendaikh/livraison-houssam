<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\DeliveryStatusMapper;
use App\Services\OrderService;
use App\Services\TawsilexService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncTawsilexOrderStatusJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    public function __construct(public int $orderId)
    {
    }

    public function handle(
        TawsilexService $tawsilexService,
        OrderService $orderService,
        DeliveryStatusMapper $deliveryStatusMapper
    ): void
    {
        $order = Order::with('deliveryIntegration')->find($this->orderId);

        if (!$order) {
            Log::warning('Tawsilex sync skipped: order not found', ['order_id' => $this->orderId]);
            return;
        }

        if (!$order->delivery_tracking_code) {
            return;
        }

        if (in_array($order->status, ['delivered', 'cancelled'], true)) {
            return;
        }

        $integration = $order->deliveryIntegration;
        if (!$integration || $integration->provider !== 'tawsilex' || !$integration->is_active) {
            return;
        }

        $apiToken = $integration->credentials['api_token']
            ?? $integration->credentials['apiToken']
            ?? $integration->credentials['token']
            ?? null;

        if (!$apiToken) {
            Log::warning('Tawsilex sync skipped: missing API token', [
                'order_id' => $order->id,
                'integration_id' => $integration->id,
            ]);
            return;
        }

        try {
            $result = $tawsilexService
                ->setApiToken($apiToken)
                ->syncOrderStatus($order);

            $mappedOrderStatus = $deliveryStatusMapper->mapToOrderStatus($result['new_delivery_status'] ?? null, 'tawsilex');

            if ($mappedOrderStatus && $mappedOrderStatus !== $order->status) {
                $orderService->updateOrderStatus(
                    $order->id,
                    $mappedOrderStatus,
                    "Status auto-synced from Tawsilex: {$result['new_delivery_status']}"
                );
            }
        } catch (\Throwable $e) {
            Log::error('Tawsilex order sync job failed', [
                'order_id' => $order->id,
                'tracking_code' => $order->delivery_tracking_code,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

}

<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\ApiIntegration;
use App\Services\BMDeliveryService;
use App\Services\TawsilexService;
use App\Services\OrderService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncDeliveryStatuses extends Command
{
    protected $signature = 'orders:sync-delivery-statuses {--order-id=} {--provider=}';
    protected $description = 'Sync order statuses from delivery companies (BMDelivery, Tawsilex)';

    public function __construct(
        private OrderService $orderService
    ) {
        parent::__construct();
    }

    public function handle()
    {
        $this->info('Starting delivery status synchronization...');

        // Build query for orders to sync
        $query = Order::whereNotNull('delivery_tracking_code')
            ->whereNotNull('delivery_integration_id')
            ->whereIn('status', ['confirmed', 'shipped']) // Only sync active orders
            ->with(['deliveryIntegration']);

        // Filter by specific order if provided
        if ($orderId = $this->option('order-id')) {
            $query->where('id', $orderId);
        }

        // Filter by provider if provided
        if ($provider = $this->option('provider')) {
            $query->whereHas('deliveryIntegration', function ($q) use ($provider) {
                $q->where('provider', $provider);
            });
        }

        $orders = $query->get();

        if ($orders->isEmpty()) {
            $this->info('No orders found to sync.');
            return 0;
        }

        $this->info("Found {$orders->count()} order(s) to sync.");

        $successCount = 0;
        $failCount = 0;
        $statusChangedCount = 0;

        foreach ($orders as $order) {
            try {
                $this->info("Syncing order #{$order->order_number} (ID: {$order->id})...");

                $integration = $order->deliveryIntegration;
                
                if (!$integration->is_active) {
                    $this->warn("  Skipping - Integration '{$integration->name}' is not active");
                    $failCount++;
                    continue;
                }

                $apiToken = $integration->credentials['api_token'] 
                    ?? $integration->credentials['apiToken'] 
                    ?? $integration->credentials['token'] 
                    ?? null;
                
                if (!$apiToken) {
                    $this->error("  Failed - No API token configured for '{$integration->name}'");
                    $failCount++;
                    continue;
                }

                $result = null;

                // Sync based on provider
                if ($integration->provider === 'bmdelivery') {
                    $bmService = new BMDeliveryService();
                    $bmService->setApiToken($apiToken);
                    $result = $bmService->syncOrderStatus($order);
                    
                } elseif ($integration->provider === 'tawsilex') {
                    $tawsilexService = new TawsilexService();
                    $tawsilexService->setApiToken($apiToken);
                    
                    if (method_exists($tawsilexService, 'syncOrderStatus')) {
                        $result = $tawsilexService->syncOrderStatus($order);
                    } else {
                        $this->warn("  Skipping - Status sync not implemented for Tawsilex");
                        continue;
                    }
                } else {
                    $this->warn("  Skipping - Unsupported provider: {$integration->provider}");
                    continue;
                }

                if ($result['status_changed']) {
                    $this->info("  Delivery status changed: {$result['old_delivery_status']} → {$result['new_delivery_status']}");
                    
                    // Update order status based on delivery status
                    $orderStatus = $this->mapDeliveryStatusToOrderStatus($result['new_delivery_status']);
                    
                    if ($orderStatus && $orderStatus !== $order->status) {
                        $this->orderService->updateOrderStatus(
                            $order->id,
                            $orderStatus,
                            "Status auto-synced from {$integration->name}: {$result['new_delivery_status']}"
                        );
                        $this->info("  Order status updated: {$order->status} → {$orderStatus}");
                        $statusChangedCount++;
                    }
                } else {
                    $this->info("  No status change (current: {$result['new_delivery_status']})");
                }

                $successCount++;

            } catch (\Exception $e) {
                $this->error("  Failed to sync order #{$order->order_number}: {$e->getMessage()}");
                Log::error('Failed to sync order in command', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                ]);
                $failCount++;
            }
        }

        $this->newLine();
        $this->info("Synchronization complete!");
        $this->info("  Successful: {$successCount}");
        $this->info("  Failed: {$failCount}");
        $this->info("  Status Changed: {$statusChangedCount}");

        return 0;
    }

    /**
     * Map delivery company status to internal order status
     */
    private function mapDeliveryStatusToOrderStatus(?string $deliveryStatus): ?string
    {
        if (!$deliveryStatus) {
            return null;
        }

        $statusMap = [
            'pending' => 'pending',
            'confirmed' => 'confirmed',
            'picked_up' => 'shipped',
            'in_transit' => 'shipped',
            'out_for_delivery' => 'shipped',
            'delivered' => 'delivered',
            'cancelled' => 'cancelled',
            'returned' => 'cancelled',
            'failed' => 'cancelled',
            
            // BMDelivery French statuses (from actual API response)
            'en attente de ramassage' => 'confirmed',
            'ramassé' => 'confirmed',
            'ramasse' => 'confirmed',
            'prêt pour expédition' => 'confirmed',
            'pret pour expedition' => 'confirmed',
            'expédié' => 'shipped',
            'expedie' => 'shipped',
            'en cours de livraison' => 'shipped',
            'en livraison' => 'shipped',
            'livré' => 'delivered',
            'livre' => 'delivered',
            'retourné' => 'cancelled',
            'retourne' => 'cancelled',
            'annulé' => 'cancelled',
            'annule' => 'cancelled',
            
            // BMDelivery statuses (normalized)
            'ramassage' => 'confirmed',
            'en attente' => 'confirmed',
            'en_attente' => 'confirmed',
            'en cours' => 'shipped',
            'en_cours' => 'shipped',
            'en route' => 'shipped',
            'en_route' => 'shipped',
            'execute' => 'delivered',
            'exécuté' => 'delivered',
            'retour' => 'cancelled',
            'demande de retour' => 'cancelled',
            'demande_de_retour' => 'cancelled',
            'interesse' => 'confirmed',
            'intéressé' => 'confirmed',
            
            'preparation' => 'confirmed',
            'expedie' => 'shipped',
            'livraison' => 'delivered',
        ];

        return $statusMap[strtolower($deliveryStatus)] ?? null;
    }
}

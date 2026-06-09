<?php

namespace App\Services;

use App\Models\ConfirmationAgentBilling;
use App\Models\DeliveryPersonBilling;
use App\Models\Order;
use App\Models\SellerBilling;
use App\Models\Setting;
use App\Support\Utf8Text;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class InvoicePdfService
{
    public function generateForBilling(string $role, int $billingId): string
    {
        $data = match ($role) {
            BillingService::ROLE_SELLER => $this->buildSellerData(SellerBilling::with(['vendor', 'orders.client', 'orders.items.product'])->findOrFail($billingId)),
            BillingService::ROLE_CONFIRMATION => $this->buildConfirmationData(ConfirmationAgentBilling::with(['user', 'orders.client', 'orders.items'])->findOrFail($billingId)),
            BillingService::ROLE_DELIVERY => $this->buildDeliveryData(DeliveryPersonBilling::with(['deliveryPerson', 'orders.client', 'orders.items'])->findOrFail($billingId)),
            default => abort(422, 'Unsupported billing role.'),
        };

        $view = match ($role) {
            BillingService::ROLE_SELLER => 'invoices.seller',
            BillingService::ROLE_CONFIRMATION => 'invoices.confirmation',
            BillingService::ROLE_DELIVERY => 'invoices.delivery',
            default => 'invoices.seller',
        };

        $pdf = Pdf::loadView($view, $data)
            ->setPaper('a4', 'portrait')
            ->setOption('defaultFont', 'DejaVu Sans')
            ->setOption('isHtml5ParserEnabled', true);

        $filename = sprintf(
            'invoices/%s-%s.pdf',
            $data['invoice_number'],
            strtolower($role)
        );

        Storage::disk('public')->put($filename, $pdf->output());

        return $filename;
    }

    public function buildSellerData(SellerBilling $billing): array
    {
        $fulfillmentCost = (float) Setting::get('order_fulfillment_cost', 10);
        $rows = collect();
        $totalSales = 0.0;
        $totalProductCost = 0.0;
        $totalDeliveryCost = 0.0;
        $totalCodFees = 0.0;

        foreach ($billing->orders as $order) {
            $clientName = $this->text($order->client?->name ?? 'N/A');
            $city = $this->text($order->city ?? $order->delivery_city ?? 'N/A');
            $orderTotal = (float) ($order->total ?? 0);
            $shippingCost = (float) ($order->shipping_cost ?? 0);
            $commission = (float) ($order->commission_amount ?? 0);

            if ($order->items->isEmpty()) {
                $rows->push([
                    'client_name' => $clientName,
                    'city' => $city,
                    'product' => 'Order ' . $order->order_number,
                    'quantity' => 1,
                    'unit_price' => $orderTotal,
                    'total_amount' => $orderTotal,
                ]);
            } else {
                foreach ($order->items as $item) {
                    $unitPrice = (float) ($item->price ?? 0);
                    $quantity = (int) ($item->quantity ?? 1);
                    $lineTotal = (float) ($item->subtotal ?? ($unitPrice * $quantity));

                    $rows->push([
                        'client_name' => $clientName,
                        'city' => $city,
                        'product' => $this->text($item->product_name ?? 'Product'),
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'total_amount' => $lineTotal,
                    ]);
                }
            }

            $productCost = $this->calculateOrderProductCost($order);
            $deliveryCost = $shippingCost + $fulfillmentCost;
            $platformCodFee = max(0.0, $commission - $productCost - $deliveryCost);

            $totalSales += $orderTotal;
            $totalProductCost += $productCost;
            $totalDeliveryCost += $deliveryCost;
            $totalCodFees += $platformCodFee;
        }

        $totalDeductions = $totalProductCost + $totalDeliveryCost + $totalCodFees;
        $finalAmount = (float) ($billing->net_amount ?? ($totalSales - $totalDeductions));

        return array_merge($this->companyContext(), [
            'role' => BillingService::ROLE_SELLER,
            'role_label' => 'Seller Invoice',
            'invoice_number' => $billing->invoice_number ?? $this->fallbackInvoiceNumber($billing->id, 'SELL'),
            'generated_at' => $billing->generated_at ?? now(),
            'period_start' => $billing->period_start,
            'period_end' => $billing->period_end,
            'entity_name' => $this->text($billing->vendor?->name ?? 'Seller'),
            'entity_phone' => $this->text($billing->vendor?->phone),
            'entity_email' => $this->text($billing->vendor?->email),
            'rows' => $rows,
            'summary' => [
                'total_orders' => $billing->orders->count(),
                'total_sales' => $totalSales,
                'total_product_cost' => $totalProductCost,
                'total_delivery_cost' => $totalDeliveryCost,
                'total_cod_fees' => $totalCodFees,
                'total_deductions' => (float) ($billing->commission_amount ?? $totalDeductions),
                'total_fees' => $totalDeductions,
                'final_amount' => max(0, $finalAmount),
            ],
        ]);
    }

    public function buildConfirmationData(ConfirmationAgentBilling $billing): array
    {
        $commissionPerOrder = (float) $billing->commission_per_order;
        $rows = $billing->orders->map(function (Order $order) use ($commissionPerOrder) {
            return [
                'client_name' => $this->text($order->client?->name ?? 'N/A'),
                'city' => $this->text($order->city ?? $order->delivery_city ?? 'N/A'),
                'product' => $this->formatOrderProducts($order),
                'quantity' => $order->items->sum('quantity') ?: 1,
                'order_amount' => (float) ($order->total ?? 0),
                'commission' => $commissionPerOrder,
            ];
        });

        $totalSales = (float) $billing->orders->sum(fn (Order $order) => (float) ($order->total ?? 0));
        $totalEarnings = (float) $billing->total_amount;

        return array_merge($this->companyContext(), [
            'role' => BillingService::ROLE_CONFIRMATION,
            'role_label' => 'Confirmation Agent Invoice',
            'invoice_number' => $billing->invoice_number ?? $this->fallbackInvoiceNumber($billing->id, 'CONF'),
            'generated_at' => $billing->generated_at ?? now(),
            'period_start' => $billing->period_start,
            'period_end' => $billing->period_end,
            'entity_name' => $this->text($billing->user?->name ?? 'Confirmation Agent'),
            'entity_phone' => $this->text($billing->user?->phone),
            'entity_email' => $this->text($billing->user?->email),
            'rows' => $rows,
            'summary' => [
                'total_orders' => $billing->orders->count(),
                'total_sales' => $totalSales,
                'total_earnings' => $totalEarnings,
                'total_fees' => 0.0,
                'final_amount' => $totalEarnings,
            ],
        ]);
    }

    public function buildDeliveryData(DeliveryPersonBilling $billing): array
    {
        $rows = $billing->orders->map(function (Order $order) {
            return [
                'client_name' => $this->text($order->client?->name ?? 'N/A'),
                'city' => $this->text($order->city ?? $order->delivery_city ?? 'N/A'),
                'product' => $this->formatOrderProducts($order),
                'quantity' => $order->items->sum('quantity') ?: 1,
                'order_amount' => (float) ($order->collected_amount ?? $order->total ?? 0),
                'commission' => (float) ($order->delivery_person_commission ?? 0),
            ];
        });

        return array_merge($this->companyContext(), [
            'role' => BillingService::ROLE_DELIVERY,
            'role_label' => 'Delivery Agent Invoice',
            'invoice_number' => $billing->invoice_number ?? $this->fallbackInvoiceNumber($billing->id, 'DEL'),
            'generated_at' => $billing->generated_at ?? now(),
            'period_start' => $billing->period_start,
            'period_end' => $billing->period_end,
            'entity_name' => $this->text($billing->deliveryPerson?->name ?? 'Delivery Agent'),
            'entity_phone' => $this->text($billing->deliveryPerson?->phone),
            'entity_email' => $this->text($billing->deliveryPerson?->email),
            'rows' => $rows,
            'summary' => [
                'total_orders' => (int) $billing->total_orders,
                'total_sales' => (float) $billing->total_collected,
                'total_earnings' => (float) $billing->total_commission,
                'total_fees' => (float) $billing->total_commission,
                'final_amount' => (float) $billing->total_due_to_admin,
            ],
        ]);
    }

    public function generateInvoiceNumber(string $rolePrefix): string
    {
        $datePart = now()->format('dmy');
        $randomPart = str_pad((string) random_int(1, 9999999), 7, '0', STR_PAD_LEFT);

        return sprintf('FC-%s-%s-%s', $rolePrefix, $datePart, $randomPart);
    }

    private function companyContext(): array
    {
        $logoUrl = Setting::get('app_logo_url');
        $logoPath = null;

        if ($logoUrl && !str_starts_with($logoUrl, 'http')) {
            $relative = ltrim(str_replace('/storage/', '', $logoUrl), '/');
            if (Storage::disk('public')->exists($relative)) {
                $logoPath = Storage::disk('public')->path($relative);
            }
        }

        return [
            'company_name' => $this->text(Setting::get('company_name', Setting::get('app_name', 'Livraison'))),
            'company_email' => $this->text(Setting::get('company_email')),
            'company_phone' => $this->text(Setting::get('company_phone')),
            'company_address' => $this->text(Setting::get('company_address')),
            'currency_symbol' => Setting::get('currency_symbol', 'DH'),
            'logo_path' => $logoPath,
        ];
    }

    private function calculateOrderProductCost(Order $order): float
    {
        return (float) $order->items->sum(function ($item) {
            $cost = (float) ($item->product?->getOrderCostAmount() ?? 0);

            return $cost * (float) ($item->quantity ?? 0);
        });
    }

    private function formatOrderProducts(Order $order): string
    {
        if ($order->items->isEmpty()) {
            return 'Order ' . $order->order_number;
        }

        return $order->items
            ->map(fn ($item) => $this->text($item->product_name ?? 'Product') . ' x' . ($item->quantity ?? 1))
            ->implode(', ');
    }

    private function text(?string $value): ?string
    {
        return Utf8Text::clean($value);
    }

    private function fallbackInvoiceNumber(int $id, string $prefix): string
    {
        return sprintf('FC-%s-%s-%07d', $prefix, now()->format('dmy'), $id);
    }

    public function formatMoney(float $amount, string $symbol = 'DH'): string
    {
        return number_format($amount, 2, '.', ' ') . ' ' . $symbol;
    }
}

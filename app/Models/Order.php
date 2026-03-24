<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'order_number',
        'client_id',
        'vendor_id',
        'delivery_agent_id',
        'delivery_person_id',
        'confirmation_agent_id',
        'created_by_user_id',
        'callback_date',
        'delivery_integration_id',
        'status',
        'payment_status',
        'source',
        'external_order_id',
        'shopify_name',
        'delivery_tracking_code',
        'delivery_status',
        'subtotal',
        'collected_amount',
        'delivery_person_commission',
        'amount_due_to_admin',
        'shipping_cost',
        'shipping_included_in_price',
        'tax',
        'discount',
        'total',
        'total_amount',
        'commission_amount',
        'shipping_address',
        'city',
        'delivery_city',
        'phone',
        'notes',
        'delivery_status_note',
        'whatsapp',
        'returned_to_confirmation_at',
        'confirmed_at',
        'picked_up_at',
        'ready_for_shipping_at',
        'sent_to_delivery_at',
        'out_for_delivery_at',
        'shipped_at',
        'delivered_at',
        'cancelled_at',
        'refused_at',
        'returned_at',
        'no_response_at',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'collected_amount' => 'decimal:2',
        'delivery_person_commission' => 'decimal:2',
        'amount_due_to_admin' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'shipping_included_in_price' => 'boolean',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'returned_to_confirmation_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'callback_date' => 'datetime',
        'picked_up_at' => 'datetime',
        'ready_for_shipping_at' => 'datetime',
        'sent_to_delivery_at' => 'datetime',
        'out_for_delivery_at' => 'datetime',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'refused_at' => 'datetime',
        'returned_at' => 'datetime',
        'no_response_at' => 'datetime',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function deliveryAgent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delivery_agent_id');
    }

    public function deliveryPerson(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delivery_person_id');
    }

    public function confirmationAgent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmation_agent_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function deliveryIntegration(): BelongsTo
    {
        return $this->belongsTo(ApiIntegration::class, 'delivery_integration_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function upsellItems(): HasMany
    {
        return $this->hasMany(OrderItem::class)->where('is_upsell', true);
    }

    public function history(): HasMany
    {
        return $this->hasMany(OrderHistory::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function confirmationBillings(): BelongsToMany
    {
        return $this->belongsToMany(
            ConfirmationAgentBilling::class,
            'confirmation_agent_billing_order',
            'order_id',
            'confirmation_agent_billing_id'
        )->withTimestamps();
    }

    public function deliveryPersonBillings(): BelongsToMany
    {
        return $this->belongsToMany(
            DeliveryPersonBilling::class,
            'delivery_person_billing_order',
            'order_id',
            'delivery_person_billing_id'
        )->withTimestamps();
    }

    public function sellerBillings(): BelongsToMany
    {
        return $this->belongsToMany(
            SellerBilling::class,
            'seller_billing_order',
            'order_id',
            'seller_billing_id'
        )->withTimestamps();
    }

    public function paidDeliveryPersonBillings(): BelongsToMany
    {
        return $this->deliveryPersonBillings()->whereNotNull('delivery_person_billings.paid_at');
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($order) {
            if (!$order->order_number) {
                $order->order_number = 'ORD-' . strtoupper(uniqid());
            }
        });
    }

    public function calculateProfit(float $fulfillmentCost = 10.0): float
    {
        $baseSellTotal = 0.0;
        $baseCostTotal = 0.0;
        $upsellSellTotal = 0.0;
        $upsellCostTotal = 0.0;

        foreach ($this->items as $item) {
            $quantity = (float) ($item->quantity ?? 0);
            $sellTotal = (float) ($item->price ?? 0) * $quantity;
            $productCost = (float) ($item->product?->getOrderCostAmount() ?? 0) * $quantity;

            if ($item->is_upsell) {
                $upsellSellTotal += $sellTotal;
                $upsellCostTotal += $productCost;
                continue;
            }

            $baseSellTotal += $sellTotal;
            $baseCostTotal += $productCost;
        }

        $shippingCost = (float) ($this->shipping_cost ?? 0);
        $discount = (float) ($this->discount ?? 0);

        return ($baseSellTotal - $discount - $baseCostTotal - $shippingCost - $fulfillmentCost)
            + ($upsellSellTotal - $upsellCostTotal);
    }
}

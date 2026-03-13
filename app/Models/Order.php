<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
        'delivery_integration_id',
        'status',
        'payment_status',
        'source',
        'external_order_id',
        'shopify_name',
        'delivery_tracking_code',
        'delivery_status',
        'subtotal',
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
        'whatsapp',
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
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'shipping_included_in_price' => 'boolean',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'confirmed_at' => 'datetime',
        'picked_up_at' => 'datetime',
        'ready_for_shipping_at' => 'datetime',
        'sent_to_delivery_at' => 'datetime',
        'out_for_delivery_at' => 'datetime',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'refused_at' => 'datetime',
        'returned_at' => 'datetime',
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

    public function deliveryIntegration(): BelongsTo
    {
        return $this->belongsTo(ApiIntegration::class, 'delivery_integration_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function history(): HasMany
    {
        return $this->hasMany(OrderHistory::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
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
}

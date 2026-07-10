<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class SellerBilling extends Model
{
    protected $fillable = [
        'invoice_number',
        'vendor_id',
        'period_start',
        'period_end',
        'supplement_sequence',
        'billing_frequency',
        'delivered_orders_count',
        'gross_sales',
        'commission_amount',
        'net_amount',
        'generated_at',
        'pdf_path',
        'paid_at',
        'paid_by_id',
        'notes',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'gross_sales' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'generated_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by_id');
    }

    public function orders(): BelongsToMany
    {
        return $this->belongsToMany(
            Order::class,
            'seller_billing_order',
            'seller_billing_id',
            'order_id'
        )->withTimestamps();
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ConfirmationAgentBilling extends Model
{
    protected $fillable = [
        'invoice_number',
        'user_id',
        'period_start',
        'period_end',
        'delivered_orders_count',
        'commission_per_order',
        'total_amount',
        'generated_at',
        'pdf_path',
        'paid_at',
        'paid_by_id',
        'notes',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'commission_per_order' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'generated_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by_id');
    }

    public function orders(): BelongsToMany
    {
        return $this->belongsToMany(
            Order::class,
            'confirmation_agent_billing_order',
            'confirmation_agent_billing_id',
            'order_id'
        )->withTimestamps();
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class DeliveryPersonBilling extends Model
{
    protected $fillable = [
        'invoice_number',
        'delivery_person_id',
        'period_start',
        'period_end',
        'total_orders',
        'total_collected',
        'total_commission',
        'total_due_to_admin',
        'generated_at',
        'pdf_path',
        'paid_at',
        'paid_by_id',
        'notes',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'total_collected' => 'decimal:2',
        'total_commission' => 'decimal:2',
        'total_due_to_admin' => 'decimal:2',
        'generated_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function deliveryPerson(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delivery_person_id');
    }

    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by_id');
    }

    public function orders(): BelongsToMany
    {
        return $this->belongsToMany(
            Order::class,
            'delivery_person_billing_order',
            'delivery_person_billing_id',
            'order_id'
        )->withTimestamps();
    }
}

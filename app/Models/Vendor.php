<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Vendor extends Model
{
    protected $fillable = [
        'name',
        'email',
        'phone',
        'address',
        'company_name',
        'tax_id',
        'commission_rate',
        'is_active',
        'total_sales',
        'total_commission',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'commission_rate' => 'decimal:2',
        'total_sales' => 'decimal:2',
        'total_commission' => 'decimal:2',
    ];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function marketplaceProducts(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'marketplace_products')
            ->withPivot('is_active', 'commission_rate', 'assigned_quantity', 'activated_at', 'deactivated_at')
            ->withTimestamps();
    }

    public function activeMarketplaceProducts(): BelongsToMany
    {
        return $this->marketplaceProducts()->wherePivot('is_active', true);
    }
}

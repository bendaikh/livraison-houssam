<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vendor extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'email',
        'password',
        'phone',
        'address',
        'city',
        'company_name',
        'tax_id',
        'bank_name',
        'rib',
        'commission_rate',
        'billing_frequency',
        'is_active',
        'total_sales',
        'total_commission',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'commission_rate' => 'decimal:2',
        'total_sales' => 'decimal:2',
        'total_commission' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

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

    public function apiIntegrations(): HasMany
    {
        return $this->hasMany(ApiIntegration::class);
    }

    public function sellerBillings(): HasMany
    {
        return $this->hasMany(SellerBilling::class);
    }
}

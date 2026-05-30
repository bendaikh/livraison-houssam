<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Product extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'sku',
        'description',
        'category_id',
        'vendor_id',
        'price',
        'company_price',
        'vendor_price',
        'recommended_price',
        'cost_price',
        'stock_quantity',
        'min_stock_quantity',
        'is_active',
        'is_marketplace_active',
        'images',
        'weight',
        'weight_unit',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_marketplace_active' => 'boolean',
        'price' => 'decimal:2',
        'company_price' => 'decimal:2',
        'vendor_price' => 'decimal:2',
        'recommended_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'weight' => 'decimal:2',
        'images' => 'array',
    ];

    protected $appends = ['image_url', 'image_urls'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function isLowStock(): bool
    {
        return $this->stock_quantity <= $this->min_stock_quantity;
    }

    public function marketplaceVendors(): BelongsToMany
    {
        return $this->belongsToMany(Vendor::class, 'marketplace_products')
            ->withPivot('is_active', 'commission_rate', 'assigned_quantity', 'activated_at', 'deactivated_at')
            ->withTimestamps();
    }

    public function marketplaceProducts(): HasMany
    {
        return $this->hasMany(MarketplaceProduct::class);
    }

    public function getOrderCostAmount(): float
    {
        return (float) ($this->company_price ?? $this->price ?? $this->vendor_price ?? $this->cost_price ?? 0);
    }

    public function getAdminCostAmount(): float
    {
        return (float) ($this->vendor_price ?? $this->cost_price ?? 0);
    }

    public function getAdminSellAmount(): float
    {
        return (float) ($this->company_price ?? $this->price ?? 0);
    }

    public function getAdminUnitProfitAmount(): float
    {
        return $this->getAdminSellAmount() - $this->getAdminCostAmount();
    }

    public function getImageUrlAttribute(): ?string
    {
        $images = $this->images ?? [];

        return isset($images[0]) ? self::resolveImageUrl($images[0]) : null;
    }

    public function getImageUrlsAttribute(): array
    {
        return collect($this->images ?? [])
            ->map(fn ($path) => self::resolveImageUrl($path))
            ->filter()
            ->values()
            ->all();
    }

    public static function resolveImageUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        if (str_starts_with($path, '/')) {
            return $path;
        }

        return Storage::disk('public')->url($path);
    }
}

<?php

namespace App\Models;

use App\Support\MoroccanPhone;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected $fillable = [
        'name',
        'email',
        'phone',
        'address',
        'city',
        'state',
        'postal_code',
        'total_spent',
        'orders_count',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'total_spent' => 'decimal:2',
    ];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    protected static function booted(): void
    {
        static::saving(function (Client $client) {
            $normalizedPhone = MoroccanPhone::normalize($client->phone);

            if ($normalizedPhone !== '') {
                $client->phone = $normalizedPhone;
            }
        });
    }
}

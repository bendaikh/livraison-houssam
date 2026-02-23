<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class City extends Model
{
    protected $fillable = [
        'name',
        'delivery_cost',
        'is_active',
    ];

    protected $casts = [
        'delivery_cost' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function orders()
    {
        return $this->hasMany(Order::class, 'city', 'name');
    }
}

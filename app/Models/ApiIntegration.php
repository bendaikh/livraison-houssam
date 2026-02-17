<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ApiIntegration extends Model
{
    protected $fillable = [
        'name',
        'type',
        'provider',
        'is_active',
        'credentials',
        'settings',
        'last_sync_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'credentials' => 'array',
        'settings' => 'array',
        'last_sync_at' => 'datetime',
    ];

    public function importLogs(): HasMany
    {
        return $this->hasMany(ApiImportLog::class);
    }
}
